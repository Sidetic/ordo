import { Injectable, Logger } from "@nestjs/common";
import type { Folder, Prisma } from "@prisma/client";
import {
  DEFAULT_PAGE_SIZE,
  ErrorCode,
  MAX_PAGE_SIZE,
  type BookmarkDto,
  type CursorPage,
} from "@ordo/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppError } from "../common/errors/app-error.js";
import { ReaderService } from "./reader.service.js";
import { FolderAccessService } from "./folder-access.service.js";
import { toBookmarkDto, toBookmarkDetailDto } from "../common/mappers.js";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
} from "../common/utils/cursor.js";

const LIST_SELECT = {
  id: true,
  userId: true,
  folderId: true,
  url: true,
  title: true,
  description: true,
  domain: true,
  contentMarkdown: true,
  contentText: true,
  fetchStatus: true,
  isRead: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookmarkSelect;

type ListItem = Prisma.BookmarkGetPayload<{ select: typeof LIST_SELECT }>;

@Injectable()
export class BookmarksService {
  private readonly logger = new Logger(BookmarksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reader: ReaderService,
    private readonly access: FolderAccessService,
  ) {}

  /** Save a URL: best-effort content extraction. The bookmark is always stored,
   *  even if the fetch fails (status reflected in fetchStatus). A null folder
   *  stores it as unfiled. */
  async create(userId: string, folder: Folder | null, url: string): Promise<BookmarkDto> {
    let extracted = null;
    try {
      extracted = await this.reader.extract(url);
    } catch (err) {
      this.logger.warn(`Extraction failed for ${url}: ${(err as Error).message}`);
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        folderId: folder ? folder.id : null,
        url,
        title: extracted?.title ?? this.safeHostname(url),
        description: extracted?.description ?? null,
        domain: extracted?.domain ?? this.safeHostname(url),
        contentHtml: extracted?.contentHtml ?? null,
        contentMarkdown: extracted?.contentMarkdown ?? null,
        contentText: extracted?.contentText ?? null,
        fetchStatus: extracted ? "ok" : "failed",
      },
    });
    return toBookmarkDto(bookmark);
  }

  /** List a folder's bookmarks; a null folder lists only unfiled bookmarks. */
  async list(
    userId: string,
    folder: Folder | null,
    opts: { cursor?: string; limit?: number },
  ): Promise<CursorPage<BookmarkDto>> {
    return this.paginate(
      { userId, folderId: folder ? folder.id : null },
      opts.cursor,
      opts.limit,
      (b) => toBookmarkDto(b),
    );
  }

  async search(
    userId: string,
    q: string,
    opts: { cursor?: string; limit?: number },
  ): Promise<CursorPage<BookmarkDto>> {
    const term = q.trim();
    const where = {
      userId,
      OR: [
        { title: { contains: term } },
        { url: { contains: term } },
        { contentText: { contains: term } },
        { description: { contains: term } },
      ],
    };
    return this.paginate(where, opts.cursor, opts.limit, (b) => toBookmarkDto(b));
  }

  async detail(
    userId: string,
    bookmarkId: string,
    folderToken: string | null,
  ): Promise<BookmarkDto & { contentHtml: string | null }> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "Bookmark not found");
    // Enforce protection on the owning folder (unfiled bookmarks have none).
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, folderToken);
    }
    return toBookmarkDetailDto(bookmark);
  }

  async update(
    userId: string,
    bookmarkId: string,
    changes: { folderId?: string | null; isRead?: boolean },
    folderToken: string | null,
  ): Promise<BookmarkDto> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "Bookmark not found");

    // If the current folder is protected, require a valid token to mutate it.
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, folderToken);
    }

    const data: { folderId?: string | null; isRead?: boolean } = {};
    if (changes.isRead !== undefined) data.isRead = changes.isRead;
    if (changes.folderId !== undefined) {
      if (changes.folderId === null) {
        // null explicitly moves the bookmark to unfiled.
        data.folderId = null;
      } else if (changes.folderId !== bookmark.folderId) {
        // target folder must exist & be owned; if protected, the token must cover it.
        await this.access.requireFolder(changes.folderId, userId, folderToken);
        data.folderId = changes.folderId;
      }
    }

    const updated = await this.prisma.bookmark.update({
      where: { id: bookmarkId },
      data,
    });
    return toBookmarkDto(updated);
  }

  async remove(
    userId: string,
    bookmarkId: string,
    folderToken: string | null,
  ): Promise<void> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "Bookmark not found");
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, folderToken);
    }
    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
  }

  /** Mark every unread bookmark in a folder as read; a null folder targets the
   *  user's unfiled bookmarks only. */
  async markAllRead(userId: string, folder: Folder | null): Promise<number> {
    const result = await this.prisma.bookmark.updateMany({
      where: { userId, folderId: folder ? folder.id : null, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  // --- internals ---

  private async paginate<T>(
    where: Record<string, unknown>,
    rawCursor: string | undefined,
    rawLimit: number | undefined,
    map: (row: ListItem) => T,
  ): Promise<CursorPage<T>> {
    const limit = clampLimit(rawLimit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const cursor = decodeCursor(rawCursor ?? null);

    const items: ListItem[] = await this.prisma.bookmark.findMany({
      where: {
        ...where,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: LIST_SELECT,
    });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && slice.length > 0
        ? encodeCursor({
            createdAt: slice[slice.length - 1].createdAt.toISOString(),
            id: slice[slice.length - 1].id,
          })
        : null;

    return {
      items: slice.map(map),
      nextCursor,
      hasMore,
    };
  }

  private safeHostname(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url.slice(0, 255);
    }
  }
}
