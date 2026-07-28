import type { Response } from "express";
import { COOKIES, TOKEN_TTL } from "@ordo/shared";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

const baseCookie = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax" as const,
  path: "/api",
};

interface CookieTokens {
  accessToken: string;
  refreshToken: string;
}

export function setAuthCookies(res: Response, tokens: CookieTokens): void {
  res.cookie(COOKIES.ACCESS, tokens.accessToken, {
    ...baseCookie,
    maxAge: TOKEN_TTL.ACCESS_MS,
  });
  res.cookie(COOKIES.REFRESH, tokens.refreshToken, {
    ...baseCookie,
    maxAge: TOKEN_TTL.REFRESH_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIES.ACCESS, { path: "/api" });
  res.clearCookie(COOKIES.REFRESH, { path: "/api" });
}
