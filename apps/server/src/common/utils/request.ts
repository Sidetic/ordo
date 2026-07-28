import type { Request } from "express";
import {
  CLIENT_TYPE_HEADER,
  CLIENT_TYPE_MOBILE,
  COOKIES,
  FOLDER_TOKEN_HEADER,
  REFRESH_TOKEN_HEADER,
} from "@ordo/shared";

export function isMobileClient(req: Request): boolean {
  return req.get(CLIENT_TYPE_HEADER)?.toLowerCase() === CLIENT_TYPE_MOBILE;
}

export function getAccessToken(req: Request): string | null {
  const header = req.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  const cookie = req.cookies?.[COOKIES.ACCESS];
  return typeof cookie === "string" && cookie ? cookie : null;
}

export function getRefreshToken(req: Request): string | null {
  const fromHeader = req.get(REFRESH_TOKEN_HEADER);
  if (fromHeader) return fromHeader;
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  if (fromBody) return fromBody;
  const cookie = req.cookies?.[COOKIES.REFRESH];
  return typeof cookie === "string" && cookie ? cookie : null;
}

export function getFolderToken(req: Request): string | null {
  const t = req.get(FOLDER_TOKEN_HEADER);
  return t || null;
}

/** Best-effort device description from request headers. */
export function getDeviceInfo(req: Request): string {
  const ua = req.get("user-agent") || "Unknown";
  return ua.slice(0, 512);
}

/** Best-effort client IP, respecting the standard forwarded header. */
export function getClientIp(req: Request): string {
  const fwd = req.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (req.ip || "").slice(0, 64);
}
