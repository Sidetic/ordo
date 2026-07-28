import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  VerifyEmailSchema,
  type AuthResponse,
  type SessionDto,
  type UserDto,
} from "@ordo/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import {
  CurrentUser,
  type AuthContext,
  type AuthenticatedRequest,
} from "../common/decorators/current-user.decorator.js";
import { AuthService } from "./auth.service.js";
import {
  getDeviceInfo,
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
  private maybeStripTokens(body: AuthResponse, mobile: boolean, res: Response): AuthResponse {
    if (mobile) return body;
    return { ...body, tokens: { accessToken: "", refreshToken: "", expiresIn: body.tokens.expiresIn } };
  }

  @Post("register")
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.register(body, {
      deviceInfo: getDeviceInfo(req),
      ip: getClientIp(req),
    });
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile, res);
  }

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.login(body, {
      deviceInfo: getDeviceInfo(req),
      ip: getClientIp(req),
    });
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile, res);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const mobile = isMobileClient(req);
    const result = await this.auth.refresh(getRefreshToken(req));
    if (!mobile) setAuthCookies(res, result.tokens);
    return this.maybeStripTokens(result, mobile, res);
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
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  @HttpCode(200)
  async verifyEmail(@Body() body: { token: string }): Promise<{ success: true }> {
    await this.auth.verifyEmail(body.token);
    return { success: true };
  }
}
