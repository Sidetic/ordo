/** Entity & response shapes shared between server and mobile client. */
import type { FolderIcon } from "./constants.js";

export interface UserDto {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionDto {
  id: string;
  deviceInfo: string | null;
  deviceName: string | null;
  deviceType: SessionDeviceType;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

export type SessionDeviceType = "phone" | "tablet" | "desktop" | "tv" | "unknown";

/** Returned to mobile clients; web clients rely on cookies. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserDto;
  session: SessionDto;
  tokens: AuthTokens;
}

export interface FolderDto {
  id: string;
  name: string;
  icon: FolderIcon;
  pinned: boolean;
  protected: boolean;
  bookmarkCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkDto {
  id: string;
  /** Owning folder, or null when the bookmark is unfiled. */
  folderId: string | null;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  contentText: string | null;
  contentMarkdown: string | null;
  fetchStatus: "pending" | "ok" | "failed";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full bookmark including HTML — only returned by GET /bookmarks/:id (reader). */
export interface BookmarkDetailDto extends BookmarkDto {
  contentHtml: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ServerInfoDto {
  name: string;
  version: string;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
