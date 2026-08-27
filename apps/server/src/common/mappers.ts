import type { Bookmark, Folder, Session, User } from "@prisma/client";
import {
  normalizeFolderIcon,
  normalizeReaderPreferences,
  type BookmarkDto,
  type ExtractionReason,
  type FetchStatus,
  type FolderDto,
  type SessionDto,
  type UserDto,
} from "@ordo/shared";

export type UserDtoFields = Pick<
  User,
  | "id"
  | "displayName"
  | "email"
  | "emailVerifiedAt"
  | "preferences"
  | "totpEnabledAt"
  | "avatarUpdatedAt"
  | "createdAt"
>;

/** Map a user row (or a superset) to a DTO; preferences fall back to defaults when malformed. */
export function toUserDto(u: UserDtoFields): UserDto {
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    emailVerified: u.emailVerifiedAt !== null,
    hasAvatar: u.avatarUpdatedAt !== null,
    avatarUpdatedAt: u.avatarUpdatedAt?.toISOString() ?? null,
    mfaEnabled: u.totpEnabledAt !== null,
    preferences: normalizeReaderPreferences(u.preferences),
    createdAt: u.createdAt.toISOString(),
  };
}

export function toSessionDto(
  s: Pick<Session, "id" | "deviceInfo" | "deviceName" | "deviceType" | "ip" | "lastSeenAt" | "createdAt"> & {
    current?: boolean;
  },
): SessionDto {
  return {
    id: s.id,
    deviceInfo: s.deviceInfo,
    deviceName: s.deviceName,
    deviceType:
      s.deviceType === "phone" ||
      s.deviceType === "tablet" ||
      s.deviceType === "desktop" ||
      s.deviceType === "tv"
        ? s.deviceType
        : "unknown",
    ip: s.ip,
    lastSeenAt: s.lastSeenAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    current: s.current ?? false,
  };
}

export interface FolderWithCounts extends Folder {
  _count?: { bookmarks: number };
  unread?: number;
}

export function toFolderDto(
  f: FolderWithCounts,
  counts: { bookmarkCount: number; unreadCount: number },
): FolderDto {
  return {
    id: f.id,
    name: f.name,
    icon: normalizeFolderIcon(f.icon),
    pinned: f.pinned,
    protected: f.passwordHash !== null,
    bookmarkCount: counts.bookmarkCount,
    unreadCount: counts.unreadCount,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

const FETCH_STATUSES: readonly FetchStatus[] = ["pending", "ok", "unsupported", "failed"];

const EXTRACTION_REASONS: readonly ExtractionReason[] = [
  "non_html_content",
  "social_video_or_app",
  "js_required",
  "login_or_paywall",
  "bot_challenge",
  "consent_wall",
  "too_short",
  "not_an_article",
  "interrupted",
  "fetch_error",
];

export type BookmarkDtoFields = Pick<
  Bookmark,
  | "id"
  | "folderId"
  | "url"
  | "title"
  | "description"
  | "domain"
  | "contentText"
  | "contentMarkdown"
  | "fetchStatus"
  | "extractionReason"
  | "extractionVersion"
  | "author"
  | "publishedAt"
  | "readingTimeMinutes"
  | "readProgress"
  | "completedAt"
  | "isRead"
  | "createdAt"
  | "updatedAt"
>;

export function toBookmarkDto(b: BookmarkDtoFields): BookmarkDto {
  return {
    id: b.id,
    folderId: b.folderId,
    url: b.url,
    title: b.title,
    description: b.description,
    domain: b.domain,
    contentText: b.contentText,
    contentMarkdown: b.contentMarkdown,
    fetchStatus: FETCH_STATUSES.includes(b.fetchStatus as FetchStatus)
      ? (b.fetchStatus as FetchStatus)
      : "failed",
    extractionReason: EXTRACTION_REASONS.includes(b.extractionReason as ExtractionReason)
      ? (b.extractionReason as ExtractionReason)
      : null,
    extractionVersion: b.extractionVersion,
    author: b.author,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    readingTimeMinutes: b.readingTimeMinutes,
    readProgress: b.readProgress,
    completedAt: b.completedAt?.toISOString() ?? null,
    isRead: b.isRead,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toBookmarkDetailDto(b: Bookmark): BookmarkDto & { contentHtml: string | null } {
  return { ...toBookmarkDto(b), contentHtml: b.contentHtml };
}
