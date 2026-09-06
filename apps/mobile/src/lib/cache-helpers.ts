/**
 * Helpers for mutating React Query infinite caches (cursor pages) without
 * full refetches — this is what keeps the UI snappy and lists stable.
 */
import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { BookmarkDetailDto, BookmarkDto, CursorPage } from "@ordo/shared";

type BookmarkData = InfiniteData<CursorPage<BookmarkDto>, string | null>;

export function updateBookmarkInPages(
  qc: QueryClient,
  queryKey: readonly unknown[],
  id: string,
  updater: (b: BookmarkDto) => BookmarkDto,
) {
  qc.setQueriesData<InfiniteData<CursorPage<BookmarkDto>>>({ queryKey }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((b) => (b.id === id ? updater(b) : b)),
      })),
    };
  });
}

export function removeBookmarkFromPages(
  qc: QueryClient,
  queryKey: readonly unknown[],
  id: string,
) {
  qc.setQueriesData<InfiniteData<CursorPage<BookmarkDto>>>({ queryKey }, (data) => {
    if (!data) return data;
    let totalRemoved = 0;
    const pages = data.pages.map((page) => {
      const items = page.items.filter((b) => {
        if (b.id === id) {
          totalRemoved += 1;
          return false;
        }
        return true;
      });
      return { ...page, items };
    });
    if (totalRemoved === 0) return data;
    return { ...data, pages };
  });
}

/** Prepend a newly-created bookmark to the first page of an infinite list. */
export function prependBookmarkToPages(
  qc: QueryClient,
  queryKey: readonly unknown[],
  bookmark: BookmarkDto,
) {
  qc.setQueriesData<BookmarkData>({ queryKey }, (data) => {
    if (!data) return data;
    const firstPage = data.pages[0];
    const updatedFirst: CursorPage<BookmarkDto> = {
      ...firstPage,
      items: [bookmark, ...firstPage.items],
    };
    return { ...data, pages: [updatedFirst, ...data.pages.slice(1)] };
  });
}

/** Re-key helper: all bookmark list caches for any folder (for global effects). */
export function allBookmarkListMatcher() {
  return { predicate: (q: { queryKey: readonly unknown[] }) => q.queryKey[0] === "bookmarks" && q.queryKey[1] !== "search" };
}

/**
 * Update a bookmark everywhere it is cached: every list (folders + search)
 * plus the detail entry (which additionally carries contentHtml). Queries
 * not containing this bookmark are returned unchanged.
 */
export function updateBookmarkEverywhere(
  qc: QueryClient,
  id: string,
  updater: (b: BookmarkDto) => BookmarkDto,
) {
  updateBookmarksEverywhere(qc, new Set([id]), updater);
}

/** Apply the same list/detail patch to many bookmarks in one cache walk. */
export function updateBookmarksEverywhere(
  qc: QueryClient,
  ids: ReadonlySet<string>,
  updater: (b: BookmarkDto) => BookmarkDto,
) {
  if (ids.size === 0) return;
  qc.setQueriesData<unknown>({ queryKey: ["bookmarks"] }, (data: unknown) => {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray((data as { pages?: unknown }).pages)) {
      const paged = data as InfiniteData<CursorPage<BookmarkDto>>;
      let changed = false;
      const pages = paged.pages.map((page) => {
        let pageChanged = false;
        const items = page.items.map((b) => {
          if (!ids.has(b.id)) return b;
          pageChanged = true;
          return updater(b);
        });
        if (!pageChanged) return page;
        changed = true;
        return { ...page, items };
      });
      return changed ? { ...paged, pages } : data;
    }
    const detail = data as BookmarkDetailDto;
    return ids.has(detail.id) ? updater(detail) : data;
  });
}

/** Remove many bookmarks from every cached list in one cache walk. */
export function removeBookmarksEverywhere(qc: QueryClient, ids: ReadonlySet<string>) {
  if (ids.size === 0) return;
  qc.setQueriesData<unknown>({ queryKey: ["bookmarks"] }, (data: unknown) => {
    if (!data || typeof data !== "object") return data;
    if (!Array.isArray((data as { pages?: unknown }).pages)) return data;
    const paged = data as InfiniteData<CursorPage<BookmarkDto>>;
    let changed = false;
    const pages = paged.pages.map((page) => {
      const items = page.items.filter((b) => {
        if (!ids.has(b.id)) return true;
        changed = true;
        return false;
      });
      return items.length === page.items.length ? page : { ...page, items };
    });
    return changed ? { ...paged, pages } : data;
  });
}

/**
 * Find a bookmark across all cached bookmark lists (folder lists + search).
 * Lets the reader render instantly from cache without a detail fetch.
 */
export function findBookmarkInCache(qc: QueryClient, id: string): BookmarkDto | undefined {
  const caches = qc.getQueriesData<InfiniteData<CursorPage<BookmarkDto>>>({
    queryKey: ["bookmarks"],
  });
  for (const [, data] of caches) {
    // The prefix also matches bookmark detail queries, which are not paginated.
    if (!data || !Array.isArray(data.pages)) continue;
    for (const page of data.pages) {
      const found = page.items.find((b) => b.id === id);
      if (found) return found;
    }
  }
  return undefined;
}
