/**
 * Bookmark queries + mutations. Optimistic updates keep the UI instant;
 * background refetch reconciles with the server.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "../lib/api/bookmarks";
import { queryClient } from "../lib/query-client";
import { qk } from "../lib/api/query-keys";
import {
  prependBookmarkToPages,
  removeBookmarkFromPages,
  updateBookmarkInPages,
} from "../lib/cache-helpers";
import { DEFAULT_PAGE_SIZE, type BookmarkDetailDto, type BookmarkDto, type FolderDto } from "@ordo/shared";

/** Decrement a folder's bookmarkCount + unreadCount in the folders cache. */
function bumpFolderCount(id: string, bookmarkDelta: number, unreadDelta: number) {
  queryClient.setQueryData<FolderDto[]>(qk.folders, (old) =>
    (old ?? []).map((f) =>
      f.id === id
        ? {
            ...f,
            bookmarkCount: Math.max(0, f.bookmarkCount + bookmarkDelta),
            unreadCount: Math.max(0, f.unreadCount + unreadDelta),
          }
        : f,
    ),
  );
}

export function useInfiniteBookmarks(folderId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.bookmarks(folderId),
    queryFn: ({ pageParam }) =>
      bookmarksApi.list({ folderId, cursor: pageParam ?? undefined, limit: DEFAULT_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled,
  });
}

export function useInfiniteSearch(q: string) {
  return useInfiniteQuery({
    queryKey: qk.search(q),
    queryFn: ({ pageParam }) =>
      bookmarksApi.search(q, pageParam ?? undefined, DEFAULT_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: q.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}

export function useBookmarkDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.bookmark(id),
    queryFn: () => bookmarksApi.detail(id),
    enabled: !!id && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, folderId }: { url: string; folderId: string }) =>
      bookmarksApi.create(url, folderId),
    onSuccess: (bookmark) => {
      prependBookmarkToPages(qc, qk.bookmarks(bookmark.folderId), bookmark);
      bumpFolderCount(bookmark.folderId, +1, bookmark.isRead ? 0 : +1);
    },
  });
}

export function useToggleRead(folderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      bookmarksApi.update(id, { isRead }, { folderId }),
    onMutate: ({ id, isRead }) => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      updateBookmarkInPages(qc, qk.bookmarks(folderId), id, (b) => ({ ...b, isRead }));
      bumpFolderCount(folderId, 0, isRead ? -1 : +1);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
    },
  });
}

export function useDeleteBookmark(folderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookmarksApi.remove(id, { folderId }),
    onMutate: (id) => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      let unreadDelta = 0;
      const list = qc.getQueryData<{ pages: { items: BookmarkDto[] }[] }>(qk.bookmarks(folderId));
      const target = list?.pages.flatMap((p) => p.items).find((b) => b.id === id);
      if (target && !target.isRead) unreadDelta = -1;
      removeBookmarkFromPages(qc, qk.bookmarks(folderId), id);
      bumpFolderCount(folderId, -1, unreadDelta);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
    },
  });
}

export function useMoveBookmark(fromFolderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toFolderId }: { id: string; toFolderId: string }) =>
      bookmarksApi.update(id, { folderId: toFolderId }, { folderId: fromFolderId }),
    onMutate: ({ id, toFolderId }) => {
      const prev = qc.getQueryData(qk.bookmarks(fromFolderId));
      let unreadDelta = 0;
      const list = qc.getQueryData<{ pages: { items: BookmarkDto[] }[] }>(qk.bookmarks(fromFolderId));
      const target = list?.pages.flatMap((p) => p.items).find((b) => b.id === id);
      if (target) {
        unreadDelta = target.isRead ? 0 : -1;
        // Optimistically appear in destination too (best-effort).
        prependBookmarkToPages(qc, qk.bookmarks(toFolderId), { ...target, folderId: toFolderId });
      }
      removeBookmarkFromPages(qc, qk.bookmarks(fromFolderId), id);
      bumpFolderCount(fromFolderId, -1, unreadDelta);
      bumpFolderCount(toFolderId, +1, target && !target.isRead ? +1 : 0);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(fromFolderId), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useMarkAllRead(folderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookmarksApi.markAllRead(folderId),
    onMutate: () => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      qc.setQueriesData<{ pages: { items: BookmarkDto[] }[] }>(
        { queryKey: qk.bookmarks(folderId) },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  items: p.items.map((b) => ({ ...b, isRead: true })),
                })),
              }
            : data,
      );
      // Zero out the folder's unread count.
      queryClient.setQueryData<FolderDto[]>(qk.folders, (old) =>
        (old ?? []).map((f) => (f.id === folderId ? { ...f, unreadCount: 0 } : f)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.bookmarks(folderId) });
      void queryClient.refetchQueries({ queryKey: qk.folders });
    },
  });
}

export type { BookmarkDetailDto };
