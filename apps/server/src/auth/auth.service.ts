import { Inject, Injectable, Logger } from "@nestjs/common";
import bcrypt from "bcryptjs";
import {
  DEFAULT_FOLDER_NAME,
  ErrorCode,
  type AuthResponse,
  type SessionDto,
  type UserDto,
} from "@ordo/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppError } from "../common/errors/app-error.js";
import { hashToken } from "../common/utils/tokens.js";
import { APP_CONFIG } from "../config/config.module.js";
import type { AppConfig } from "../config/config.module.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";
import { MailService } from "./mail.service.js";
import { toUserDto, toSessionDto } from "../common/mappers.js";

const BCRYPT_COST = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface ClientMeta {
  deviceInfo: string;
  ip: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async register(
    input: { username: string; email: string; password: string },
    meta: ClientMeta,
  ): Promise<AuthResponse> {
    if (!this.cfg.registrationEnabled) {
      throw new AppError(ErrorCode.REGISTRATION_DISABLED, "Registration is disabled on this server");
    }

    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        username: input.username.trim(),
        email,
        passwordHash,
        folders: {
          create: [{ name: DEFAULT_FOLDER_NAME, isDefault: true, position: 0 }],
        },
      },
      include: { folders: true },
    });

    if (this.cfg.emailVerificationRequired) {
      await this.createAndSendVerification(user.id, email);
    }

    const { session, tokens } = await this.sessions.create(user.id, meta);
    return this.buildAuthResponse(user, session.id, tokens);
  }

  async login(
    input: { email: string; password: string },
    meta: ClientMeta,
  ): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect email or password");
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect email or password");
    }
    if (this.cfg.emailVerificationRequired && user.emailVerifiedAt === null) {
      throw new AppError(
        ErrorCode.EMAIL_NOT_VERIFIED,
        "Please verify your email before signing in",
      );
    }

    const { session, tokens } = await this.sessions.create(user.id, meta);
    return this.buildAuthResponse(user, session.id, tokens);
  }

  async refresh(refreshToken: string | null | undefined): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new AppError(ErrorCode.SESSION_REVOKED, "This session is no longer valid");
    }
    const { session, tokens } = await this.sessions.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await this.sessions.revokeByAccessHash(tokens.accessHash).catch(() => undefined);
      throw new AppError(ErrorCode.SESSION_REVOKED, "This session is no longer valid");
    }
    return this.buildAuthResponse(user, session.id, tokens);
  }

  async logout(sessionId: string, accessToken: string | null): Promise<void> {
    if (accessToken) {
      // revoke by access hash covers the rotating-token case robustly
      await this.sessions.revokeByAccessHash(hashToken(accessToken)).catch(() => undefined);
      return;
    }
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, "Account not found");
    return toUserDto(user);
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    const sessions = await this.sessions.listForUser(userId, currentSessionId);
    return sessions.map(toSessionDto);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId, userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const hash = hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hash },
    });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new AppError(
        ErrorCode.INVALID_VERIFICATION_TOKEN,
        "This verification link is invalid or has expired",
      );
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.emailVerifiedAt !== null) return; // no-op to avoid enumeration
    await this.createAndSendVerification(user.id, user.email);
  }

  async changeUsername(userId: string, newUsername: string): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username: newUsername.trim() },
    });
    return toUserDto(user);
  }

  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmail: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, "Account not found");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect password");
    }

    if (newEmail === user.email) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "New email must be different from your current email");
    }

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, "An account with this email already exists");
    }

    await this.prisma.user.update({ where: { id: userId }, data: { pendingEmail: newEmail } });
    await this.createAndSendVerification(userId, newEmail);
  }

  async resendEmailChange(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pendingEmail) return;
    await this.createAndSendVerification(userId, user.pendingEmail);
  }

  async verifyEmailChange(userId: string, token: string): Promise<UserDto> {
    const hash = hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hash },
    });
    if (!record || record.userId !== userId || record.consumedAt || record.expiresAt < new Date()) {
      throw new AppError(
        ErrorCode.INVALID_VERIFICATION_TOKEN,
        "This verification code is invalid or has expired",
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pendingEmail) {
      throw new AppError(
        ErrorCode.INVALID_VERIFICATION_TOKEN,
        "No pending email change to verify",
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      return tx.user.update({
        where: { id: userId },
        data: {
          email: user.pendingEmail as string,
          pendingEmail: null,
          emailVerifiedAt: new Date(),
        },
      });
    });
    return toUserDto(updated);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
  ): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, "Account not found");
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect password");
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    // Sign out everywhere else; the current session stays alive.
    await this.sessions.revokeAllExcept(userId, currentSessionId);
    return toUserDto(updated);
  }

  private async createAndSendVerification(userId: string, email: string): Promise<void> {
    // invalidate previous tokens for this user
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    const token = this.tokens.generateVerificationToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
    });
    try {
      await this.mail.sendVerification(email, token);
    } catch (err) {
      this.logger.error(`Failed to send verification email: ${(err as Error).message}`);
    }
  }

  private buildAuthResponse(
    user: { id: string; username: string; email: string; emailVerifiedAt: Date | null; createdAt: Date },
    sessionId: string,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): AuthResponse {
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerifiedAt !== null,
        createdAt: user.createdAt.toISOString(),
      },
      session: {
        id: sessionId,
        deviceInfo: null,
        ip: null,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        current: true,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }
}
