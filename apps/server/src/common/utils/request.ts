import type { Request } from "express";
import {
  CLIENT_TYPE_HEADER,
  CLIENT_TYPE_MOBILE,
  COOKIES,
  DEVICE_NAME_HEADER,
  DEVICE_TYPE_HEADER,
  FOLDER_TOKEN_HEADER,
  REFRESH_TOKEN_HEADER,
  type SessionDeviceType,
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

const DEVICE_TYPES = new Set<SessionDeviceType>(["phone", "tablet", "desktop", "tv", "unknown"]);

/** Untrusted display metadata; values are bounded before persistence. */
export function getDeviceMetadata(req: Request): {
  deviceInfo: string;
  deviceName: string | null;
  deviceType: SessionDeviceType;
} {
  const deviceInfo = getDeviceInfo(req);
  const encodedName = req.get(DEVICE_NAME_HEADER);
  let deviceName: string | null = null;
  if (encodedName) {
    try {
      deviceName = decodeURIComponent(encodedName).trim().slice(0, 120) || null;
    } catch {
      deviceName = encodedName.trim().slice(0, 120) || null;
    }
  }

  if (!deviceName) {
    const androidModel = deviceInfo.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|[;)])/i)?.[1];
    deviceName = androidModel?.trim() ||
      (/ipad/i.test(deviceInfo)
        ? "iPad"
        : /iphone/i.test(deviceInfo)
          ? "iPhone"
          : /windows/i.test(deviceInfo)
            ? "Windows PC"
            : /macintosh|mac os/i.test(deviceInfo)
              ? "Mac"
              : /linux/i.test(deviceInfo)
                ? "Linux device"
                : null);
  }

  const requestedType = req.get(DEVICE_TYPE_HEADER)?.toLowerCase() as SessionDeviceType | undefined;
  const deviceType = requestedType && DEVICE_TYPES.has(requestedType)
    ? requestedType
    : /ipad|tablet/i.test(deviceInfo)
      ? "tablet"
      : /iphone|android|mobile/i.test(deviceInfo)
        ? "phone"
        : /windows|macintosh|mac os|linux/i.test(deviceInfo)
          ? "desktop"
          : "unknown";

  return { deviceInfo, deviceName, deviceType };
}

/** Best-effort client IP, respecting the standard forwarded header. */
export function getClientIp(req: Request): string {
  const fwd = req.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (req.ip || "").slice(0, 64);
}
