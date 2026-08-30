/** Entity & response shapes shared between server and mobile client. */
import type { FolderIcon, TagColor } from "./constants.js";

export interface UserDto {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  hasAvatar: boolean;
  avatarUpdatedAt: string | null;
  mfaEnabled: boolean;
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

export type FolderLockType = "device" | "pattern" | "pin" | "password";

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

/** Password was accepted but TOTP (or a backup code) is still required. */
export interface MfaRequiredResponse {
  mfaRequired: true;
  challengeToken: string;
  methods: ["totp"];
  emailRecoveryAvailable: boolean;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export function isMfaRequiredResponse(value: LoginResponse): value is MfaRequiredResponse {
  return "mfaRequired" in value && value.mfaRequired === true;
}

export interface MfaStatusDto {
  totpEnabled: boolean;
  backupCodesRemaining: number;
}

export interface TotpBeginDto {
  secret: string;
  otpauthUrl: string;
}

export interface TotpConfirmDto {
  backupCodes: string[];
  user: UserDto;
}

export interface BackupCodesDto {
  backupCodes: string[];
}

export interface FolderDto {
  id: string;
  name: string;
  icon: FolderIcon;
  pinned: boolean;
  protected: boolean;
  lockType: FolderLockType | null;
  bookmarkCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagSummaryDto {
  id: string;
  name: string;
  color: TagColor;
}

export interface TagDto extends TagSummaryDto {
  bookmarkCount: number;
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
  tags: TagSummaryDto[];
  suggestedTags: TagSummaryDto[];
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
  /** True when the server has a working SMTP transport (codes are emailed). */
  smtpConfigured: boolean;
  profilePictureMaxBytes: number;
  avatarAllowAnimated: boolean;
  mfaRequired: boolean;
  /** True when the server persists folder lock types (pattern/PIN/device). */
  folderLockTypes: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
