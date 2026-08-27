import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  ChangeEmailSchema,
  ChangePasswordSchema,
  ChangeUsernameSchema,
  DeleteAccountSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  UpdateReaderPreferencesSchema,
  VerifyEmailChangeSchema,
  VerifyEmailSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SessionDto,
  type UpdateReaderPreferencesInput,
  type UserDto,
  type VerifyEmailChangeInput,
  type VerifyEmailInput,
} from "@ordo/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import {
  CurrentUser,
  type AuthContext,
  type AuthenticatedRequest,
} from "../common/decorators/current-user.decorator.js";
import { AuthService } from "./auth.service.js";
import {
  getDeviceMetadata,
  getClientIp,
  getAccessToken,
  getRefreshToken,
  isMobileClient,
} from "../common/utils/request.js";
import { clearAuthCookies, setAuthCookies } from "./cookies.js";
import { AuthGuard } from "./auth.guard.js";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Strip tokens from the body when the client is web (it uses cookies). */
  private maybeStripTokens(body: AuthResponse, mobile: boolean): AuthResponse {
    if (mobile) return body;
    return { ...body, tokens: { accessToken: "", refreshToken: "", expiresIn: body.tokens.expiresIn } };
  }

  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: { username: string; email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.register(body, {
      ...getDeviceMetadata(req),
      ip: getClientIp(req),
    });
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile);
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: { identifier: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.login(body, {
      ...getDeviceMetadata(req),
      ip: getClientIp(req),
    });
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.refresh(getRefreshToken(req), getDeviceMetadata(req));
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile);
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<{ success: true }> {
    await this.auth.requestPasswordReset(body.email);
    return { success: true };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<{ success: true }> {
    await this.auth.resetPassword(body.email, body.token, body.newPassword);
    return { success: true };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AuthContext,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const access = getAccessToken(req);
    await this.auth.logout(user.sessionId, access);
    clearAuthCookies(res);
    return { success: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthContext): Promise<UserDto> {
    return this.auth.me(user.userId);
  }

  /** Merge a partial reader-preferences patch into the user's synced prefs. */
  @Patch("preferences")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async updatePreferences(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(UpdateReaderPreferencesSchema))
    body: UpdateReaderPreferencesInput,
  ): Promise<UserDto> {
    return this.auth.updatePreferences(user.userId, body);
  }

  @Get("sessions")
  @UseGuards(AuthGuard)
  async sessions(@CurrentUser() user: AuthContext): Promise<SessionDto[]> {
    return this.auth.listSessions(user.userId, user.sessionId);
  }

  @Delete("sessions/:id")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async revokeSession(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
  ): Promise<{ success: true }> {
    await this.auth.revokeSession(user.userId, id);
    return { success: true };
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) body: VerifyEmailInput,
  ): Promise<{ success: true }> {
    await this.auth.verifyEmail(body.email, body.token);
    return { success: true };
  }

  @Post("username")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async changeUsername(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangeUsernameSchema)) body: { newUsername: string },
  ): Promise<UserDto> {
    return this.auth.changeUsername(user.userId, body.newUsername);
  }

  @Post("email/change")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async changeEmail(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangeEmailSchema)) body: { currentPassword: string; newEmail: string },
  ): Promise<{ success: true }> {
    await this.auth.requestEmailChange(user.userId, body.currentPassword, body.newEmail);
    return { success: true };
  }

  @Post("email/change/resend")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async resendEmailChange(@CurrentUser() user: AuthContext): Promise<{ success: true }> {
    await this.auth.resendEmailChange(user.userId);
    return { success: true };
  }

  @Post("email/verify-change")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async verifyEmailChange(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(VerifyEmailChangeSchema)) body: VerifyEmailChangeInput,
  ): Promise<UserDto> {
    return this.auth.verifyEmailChange(user.userId, body.token);
  }

  @Post("password")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: { currentPassword: string; newPassword: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.changePassword(
      user.userId,
      body.currentPassword,
      body.newPassword,
      { ...getDeviceMetadata(req), ip: getClientIp(req) },
    );
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile);
  }

  @Delete("account")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async deleteAccount(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(DeleteAccountSchema)) body: { currentPassword: string; confirmation: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.auth.deleteAccount(user.userId, body.currentPassword);
    clearAuthCookies(res);
    return { success: true };
  }
}
