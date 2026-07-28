import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

/** Authenticated request augmented by AuthGuard. */
export interface AuthContext {
  userId: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthContext;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return req.user;
});
