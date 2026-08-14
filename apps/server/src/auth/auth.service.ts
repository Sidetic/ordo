import { Inject, Injectable, Logger } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Session } from "@prisma/client";
import {
  DEFAULT_FOLDER_NAME,
  ErrorCode,
  type AuthResponse,
  type SessionDeviceType,
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
  deviceName: string | null;
  deviceType: SessionDeviceType;
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
    const username = input.username.trim();
    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, "An account with this email already exists");
    }
    if (existingUsername) {
      throw new AppError(ErrorCode.CONFLICT, "This username is already taken");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        username,
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
    return this.buildAuthResponse(user, session, tokens);
  }

  async login(
    input: { identifier: string; password: string },
    meta: ClientMeta,
  ): Promise<AuthResponse> {
    const identifier = input.identifier.trim();
    const user = identifier.includes("@")
      ? await this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : await this.prisma.user.findUnique({ where: { username: identifier } });
    if (!user) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect email, username, or password");
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect email, username, or password");
    }
    if (this.cfg.emailVerificationRequired && user.emailVerifiedAt === null) {
      throw new AppError(
        ErrorCode.EMAIL_NOT_VERIFIED,
        "Please verify your email before signing in",
      );
    }

    const { session, tokens } = await this.sessions.create(user.id, meta);
    return this.buildAuthResponse(user, session, tokens);
  }

  async refresh(refreshToken: string | null | undefined, meta?: Omit<ClientMeta, "ip">): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new AppError(ErrorCode.SESSION_REVOKED, "This session is no longer valid");
    }
    const { session, tokens } = await this.sessions.rotate(refreshToken, meta);
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await this.sessions.revokeByAccessHash(tokens.accessHash).catch(() => undefined);
      throw new AppError(ErrorCode.SESSION_REVOKED, "This session is no longer valid");
    }
    return this.buildAuthResponse(user, session, tokens);
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
    const username = newUsername.trim();
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== userId) {
      throw new AppError(ErrorCode.CONFLICT, "This username is already taken");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username },
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
    meta: ClientMeta,
  ): Promise<AuthResponse> {
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
    // Sign out everywhere (including this session) and start fresh.
    await this.sessions.revokeAll(userId);
    const { session, tokens } = await this.sessions.create(updated.id, meta);
    return this.buildAuthResponse(updated, session, tokens);
  }

  async deleteAccount(userId: string, currentPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, "Account not found");
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect password");
    }
    await this.prisma.user.deleteMany({ where: { id: userId } });
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
    session: Session,
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
      session: toSessionDto({ ...session, current: true }),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }
}
