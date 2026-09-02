import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import type { Folder, Prisma } from "@prisma/client";
import {
  DEFAULT_PAGE_SIZE,
  ErrorCode,
  EXTRACTION_VERSION,
  MAX_PAGE_SIZE,
  READ_COMPLETION_THRESHOLD,
  type BookmarkDto,
  type CursorPage,
} from "@ordo/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppError } from "../common/errors/app-error.js";
import { ReaderService, UnsupportedContentError } from "./reader.service.js";
import { FolderAccessService } from "./folder-access.service.js";
import { TagsService } from "./tags.service.js";
import { TagSuggestionService } from "./tag-suggestion.service.js";
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
  extractionReason: true,
  extractionVersion: true,
  author: true,
  publishedAt: true,
  readingTimeMinutes: true,
  readProgress: true,
  completedAt: true,
  isRead: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    select: { tag: { select: { id: true, name: true, color: true } } },
  },
  suggestions: {
    where: { status: "pending" },
    select: { tag: { select: { id: true, name: true, color: true } } },
  },
} satisfies Prisma.BookmarkSelect;

type ListItem = Prisma.BookmarkGetPayload<{ select: typeof LIST_SELECT }>;

/** Background refresh tuning: low concurrency, small batches, finite spacing. */
const REFRESH_BATCH_SIZE = 50;
const REFRESH_CONCURRENCY = 2;
const REFRESH_DELAY_MS = 250;
/** Hard stop so a pathological database can never loop forever. */
const REFRESH_MAX_BATCHES = 500;

@Injectable()
export class BookmarksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookmarksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reader: ReaderService,
    private readonly access: FolderAccessService,
    private readonly tags: TagsService,
    private readonly tagSuggestions: TagSuggestionService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Extractions interrupted by a shutdown stay pending in the database; mark
    // them failed without a version so the refresh below retries them once.
    const interrupted = await this.prisma.bookmark.updateMany({
      where: { fetchStatus: "pending" },
      data: { fetchStatus: "failed", extractionReason: "interrupted" },
    });
    if (interrupted.count > 0) {
      this.logger.warn(`Marked ${interrupted.count} interrupted extractions as failed`);
    }
    // Non-blocking: never delay startup on re-extraction work.
    void this.refreshStaleExtractions();
  }

  /** Save immediately, then enrich the bookmark in the background. */
  async create(
    userId: string,
    folder: Folder | null,
    url: string,
    tagIds: string[] = [],
  ): Promise<BookmarkDto> {
    await this.tags.requireOwnedIds(userId, tagIds);
    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        folderId: folder ? folder.id : null,
        url,
        title: this.safeHostname(url),
        domain: this.safeHostname(url),
        fetchStatus: "pending",
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: LIST_SELECT,
    });
    void this.enrichBookmark(bookmark.id, url);
    return toBookmarkDto(bookmark);
  }

  /** List a folder's bookmarks; a null folder lists only unfiled bookmarks.
   *  `scope=all` spans the whole library, hiding protected-folder bookmarks
   *  unless one of the presented unlock tokens opens them. */
  async list(
    userId: string,
    folder: Folder | null,
    opts: { cursor?: string; limit?: number; scopeAll?: boolean; tagIds?: string[]; folderTokens?: string[] },
  ): Promise<CursorPage<BookmarkDto>> {
    const tagIds = opts.tagIds ?? [];
    await this.tags.requireOwnedIds(userId, tagIds);
    const authorized = opts.scopeAll
      ? await this.access.authorizedFolderIds(userId, opts.folderTokens ?? [])
      : [];
    return this.paginate(
      {
        userId,
        ...(opts.scopeAll
          ? this.access.visibleBookmarksFilter(authorized)
          : { folderId: folder ? folder.id : null }),
        ...this.tagFilter(tagIds),
      },
      opts.cursor,
      opts.limit,
      (b) => toBookmarkDto(b),
    );
  }

  async search(
    userId: string,
    q: string,
    opts: { cursor?: string; limit?: number; tagIds?: string[]; folderTokens?: string[] },
  ): Promise<CursorPage<BookmarkDto>> {
    const term = q.trim();
    const tagIds = opts.tagIds ?? [];
    await this.tags.requireOwnedIds(userId, tagIds);
    const authorized = await this.access.authorizedFolderIds(userId, opts.folderTokens ?? []);
    const where: Prisma.BookmarkWhereInput = {
      userId,
      AND: [
        this.access.visibleBookmarksFilter(authorized),
        ...(term
          ? [
              {
                OR: [
                  { title: { contains: term } },
                  { url: { contains: term } },
                  { contentText: { contains: term } },
                  { description: { contains: term } },
                  { tags: { some: { tag: { name: { contains: term } } } } },
                ],
              } satisfies Prisma.BookmarkWhereInput,
            ]
          : []),
        ...tagIds.map((tagId) => ({ tags: { some: { tagId } } })),
      ],
    };
    return this.paginate(where, opts.cursor, opts.limit, (b) => toBookmarkDto(b));
  }

  async detail(
    userId: string,
    bookmarkId: string,
    tokens: readonly string[],
  ): Promise<BookmarkDto & { contentHtml: string | null }> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
      include: {
        tags: { include: { tag: true } },
        suggestions: { where: { status: "pending" }, include: { tag: true } },
      },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "This bookmark no longer exists.");
    // Enforce protection on the owning folder (unfiled bookmarks have none).
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, tokens);
    }
    return toBookmarkDetailDto(bookmark);
  }

  async update(
    userId: string,
    bookmarkId: string,
    changes: { folderId?: string | null; isRead?: boolean; readProgress?: number },
    tokens: readonly string[],
  ): Promise<BookmarkDto> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "This bookmark no longer exists.");

    // If the current folder is protected, require a valid token to mutate it.
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, tokens);
    }

    const data: {
      folderId?: string | null;
      isRead?: boolean;
      readProgress?: number;
      completedAt?: Date | null;
    } = {};
    if (changes.isRead !== undefined) {
      data.isRead = changes.isRead;
      if (!changes.isRead) data.completedAt = null;
    }
    if (changes.readProgress !== undefined) {
      // Clamp defensively even though the schema already bounds it to 0..1.
      const progress = Math.min(1, Math.max(0, changes.readProgress));
      data.readProgress = progress;
      if (progress >= READ_COMPLETION_THRESHOLD) {
        data.isRead = true;
        data.completedAt = bookmark.completedAt ?? new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (changes.folderId !== undefined) {
      if (changes.folderId === null) {
        // null explicitly moves the bookmark to unfiled.
        data.folderId = null;
      } else if (changes.folderId !== bookmark.folderId) {
        // target folder must exist & be owned; if protected, the token must cover it.
        await this.access.requireFolder(changes.folderId, userId, tokens);
        data.folderId = changes.folderId;
      }
    }

    const updated = await this.prisma.bookmark.update({
      where: { id: bookmarkId },
      data,
      select: LIST_SELECT,
    });
    return toBookmarkDto(updated);
  }

  async remove(
    userId: string,
    bookmarkId: string,
    tokens: readonly string[],
  ): Promise<void> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "This bookmark no longer exists.");
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, tokens);
    }
    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
  }

  async updateTags(
    userId: string,
    bookmarkId: string,
    tagIds: string[],
    dismissedSuggestionIds: string[],
    tokens: readonly string[],
  ): Promise<BookmarkDto> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
      select: { id: true, folderId: true },
    });
    if (!bookmark) throw new AppError(ErrorCode.BOOKMARK_NOT_FOUND, "This bookmark no longer exists.");
    if (bookmark.folderId) {
      await this.access.requireFolder(bookmark.folderId, userId, tokens);
    }
    await this.tags.requireOwnedIds(userId, [...tagIds, ...dismissedSuggestionIds]);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bookmarkTag.deleteMany({ where: { bookmarkId } });
      if (tagIds.length > 0) {
        await tx.bookmarkTag.createMany({
          data: tagIds.map((tagId) => ({ bookmarkId, tagId })),
        });
      }
      if (dismissedSuggestionIds.length > 0) {
        await tx.bookmarkTagSuggestion.updateMany({
          where: { bookmarkId, tagId: { in: dismissedSuggestionIds }, status: "pending" },
          data: { status: "dismissed" },
        });
      }
      await tx.bookmarkTagSuggestion.deleteMany({
        where: { bookmarkId, tagId: { in: tagIds } },
      });
      return tx.bookmark.findUniqueOrThrow({ where: { id: bookmarkId }, select: LIST_SELECT });
    });
    return toBookmarkDto(updated);
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

  private async enrichBookmark(bookmarkId: string, url: string): Promise<void> {
    try {
      const extracted = await this.reader.extract(url);
      // updateMany: a row deleted mid-flight is a harmless no-op.
      await this.prisma.bookmark.updateMany({
        where: { id: bookmarkId },
        data: {
          title: extracted.title,
          description: extracted.description,
          domain: extracted.domain,
          author: extracted.author,
          publishedAt: extracted.publishedAt ? new Date(extracted.publishedAt) : null,
          readingTimeMinutes: extracted.readingTimeMinutes,
          contentHtml: extracted.contentHtml,
          contentMarkdown: extracted.contentMarkdown,
          contentText: extracted.contentText,
          fetchStatus: "ok",
          extractionReason: null,
          extractionVersion: EXTRACTION_VERSION,
        },
      });
      // Suggestions derive from the freshly stored content; failures are
      // logged and never affect the bookmark or its extraction status.
      this.tagSuggestions.refreshSafely(bookmarkId);
    } catch (err) {
      // Typed rejections are stored as `unsupported` with the reason; anything
      // else (network, HTTP errors, parse crashes) is a plain failure.
      const unsupported = err instanceof UnsupportedContentError;
      const reason = unsupported ? err.reason : "fetch_error";
      this.logger.warn(
        `Extraction ${unsupported ? "rejected" : "failed"} for bookmark ${bookmarkId} (${this.safeHostname(url)}): ${reason} — ${(err as Error).message}`,
      );
      const existing = await this.prisma.bookmark.findUnique({
        where: { id: bookmarkId },
        select: { contentHtml: true, contentText: true },
      });
      const storedContentIsShell = existing?.contentText
        ? this.reader.classifyShellText(existing.contentText) !== null
        : false;
      const definitivelyUnreadable =
        unsupported &&
        (storedContentIsShell ||
          ["social_video_or_app", "js_required", "too_short", "not_an_article"].includes(reason));
      await this.prisma.bookmark
        .updateMany({
          where: { id: bookmarkId },
          data: definitivelyUnreadable || (unsupported && !existing?.contentHtml)
            ? {
                fetchStatus: "unsupported",
                extractionReason: reason,
                extractionVersion: EXTRACTION_VERSION,
                contentHtml: null,
                contentMarkdown: null,
                contentText: null,
                readingTimeMinutes: null,
              }
            : existing?.contentHtml
              ? {
                  // A transient fetch/interstitial failure must not destroy a
                  // readable capture from the previous extraction version.
                  fetchStatus: "ok",
                  extractionReason: null,
                  extractionVersion: EXTRACTION_VERSION,
                }
              : {
                  fetchStatus: "failed",
                  extractionReason: reason,
                  extractionVersion: EXTRACTION_VERSION,
                },
        })
        .catch((updateError: unknown) => {
          this.logger.error(
            `Could not update extraction status for bookmark ${bookmarkId}: ${(updateError as Error).message}`,
          );
        });
    }
  }

  /**
   * Re-extract bookmarks whose content predates the current pipeline version
   * (including rows left unversioned by an interrupted boot). Runs in small
   * batches with low concurrency and a finite delay; because every outcome —
   * ok, unsupported, or failed — stamps the current version, rows are retried
   * at most once per version and never loop within a boot.
   */
  private async refreshStaleExtractions(): Promise<void> {
    try {
      for (let batch = 0; batch < REFRESH_MAX_BATCHES; batch += 1) {
        const stale = await this.prisma.bookmark.findMany({
          where: {
            fetchStatus: { not: "pending" },
            OR: [
              { extractionVersion: null },
              { extractionVersion: { lt: EXTRACTION_VERSION } },
            ],
          },
          select: { id: true, url: true },
          orderBy: { id: "asc" },
          take: REFRESH_BATCH_SIZE,
        });
        if (stale.length === 0) return;

        const workers = Array.from({ length: REFRESH_CONCURRENCY }, async (_, slot) => {
          for (let i = slot; i < stale.length; i += REFRESH_CONCURRENCY) {
            const { id, url } = stale[i];
            await this.enrichBookmark(id, url);
          }
        });
        await Promise.all(workers);

        if (stale.length < REFRESH_BATCH_SIZE) return;
        await new Promise((resolve) => setTimeout(resolve, REFRESH_DELAY_MS));
      }
      this.logger.warn(
        `Stopped refreshing stale extractions after ${REFRESH_MAX_BATCHES} batches`,
      );
    } catch (err) {
      this.logger.error(`Stale extraction refresh failed: ${(err as Error).message}`);
    }
  }

  private async paginate<T>(
    where: Prisma.BookmarkWhereInput,
    rawCursor: string | undefined,
    rawLimit: number | undefined,
    map: (row: ListItem) => T,
  ): Promise<CursorPage<T>> {
    const limit = clampLimit(rawLimit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const cursor = decodeCursor(rawCursor ?? null);

    const items: ListItem[] = await this.prisma.bookmark.findMany({
      where: cursor
        ? {
            AND: [
              where,
              {
                OR: [
                 { createdAt: { lt: new Date(cursor.createdAt) } },
                 { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : where,
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

  private tagFilter(tagIds: string[]): Prisma.BookmarkWhereInput {
    return tagIds.length === 0
      ? {}
      : { AND: tagIds.map((tagId) => ({ tags: { some: { tagId } } })) };
  }
}
