/** Entity & response shapes shared between server and mobile client. */
import type { FolderIcon } from "./constants.js";

export interface UserDto {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  preferences: ReaderPreferences;
  createdAt: string;
}

export type ReaderFontFamily = "sans" | "serif" | "mono";
export type ReaderFontSize = "small" | "medium" | "large" | "xlarge";
export type ReaderTheme = "system" | "light" | "dark" | "sepia";

/** Synced reader appearance preferences persisted on the user. */
export interface ReaderPreferences {
  fontFamily: ReaderFontFamily;
  fontSize: ReaderFontSize;
  theme: ReaderTheme;
  amoled: boolean;
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

export type FetchStatus = "pending" | "ok" | "unsupported" | "failed";

/**
 * Machine-readable reason a bookmark's extraction ended in `unsupported` or
 * `failed`. Stored alongside `fetchStatus` so clients can explain themselves.
 */
export type ExtractionReason =
  | "non_html_content" // PDF/image/archive file or a non-HTML response
  | "social_video_or_app" // social/video/app destination an article reader can't serve
  | "js_required" // JavaScript-only shell ("please enable JavaScript", …)
  | "login_or_paywall" // login/subscription wall hides the content
  | "bot_challenge" // bot check / CAPTCHA interstitial
  | "consent_wall" // cookie/consent interstitial hides the content
  | "too_short" // extracted (or visible) content is empty or tiny
  | "not_an_article" // link-heavy list/home/search shell with no article body
  | "interrupted" // extraction was pending when the server stopped
  | "fetch_error"; // network/HTTP failure while fetching

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
  fetchStatus: FetchStatus;
  /** Why extraction ended in `unsupported`/`failed`; null when it succeeded. */
  extractionReason: ExtractionReason | null;
  /** Pipeline version that produced the stored content (null = pre-versioning). */
  extractionVersion: number | null;
  author: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  /** Reading position within the article, 0..1. */
  readProgress: number;
  completedAt: string | null;
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
