import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { ErrorCode } from "@ordo/shared";
import type { AuthenticatedRequest } from "../common/decorators/current-user.decorator.js";
import { AppError } from "../common/errors/app-error.js";
import { getAccessToken } from "../common/utils/request.js";
import { SessionService } from "./session.service.js";

/**
 * Validates the access token (cookie or Bearer) against the session table and
 * attaches `req.user = { userId, sessionId }`. Distinguishes expired tokens so
 * the client can transparently refresh.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getAccessToken(req);
    if (!token) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Sign in to continue");
    }
    const result = await this.sessions.validateAccess(token);
    if (!result) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Sign in to continue");
    }
    if (result.expired) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, "Your session has expired");
    }
    req.user = { userId: result.userId, sessionId: result.sessionId };
    return true;
  }
}
