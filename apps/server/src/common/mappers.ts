import type { Bookmark, Folder, Session, User } from "@prisma/client";
import type {
  BookmarkDto,
  FolderDto,
  SessionDto,
  UserDto,
} from "@ordo/shared";

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    emailVerified: u.emailVerifiedAt !== null,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toSessionDto(
  s: Pick<Session, "id" | "deviceInfo" | "ip" | "lastSeenAt" | "createdAt"> & {
    current?: boolean;
  },
): SessionDto {
  return {
    id: s.id,
    deviceInfo: s.deviceInfo,
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
    protected: f.passwordHash !== null,
    bookmarkCount: counts.bookmarkCount,
    unreadCount: counts.unreadCount,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

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
    isRead: b.isRead,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toBookmarkDetailDto(b: Bookmark): BookmarkDto & { contentHtml: string | null } {
  return { ...toBookmarkDto(b), contentHtml: b.contentHtml };
}