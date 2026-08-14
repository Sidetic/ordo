/**
 * Bookmark queries + mutations. Optimistic updates keep the UI instant;
 * background refetch reconciles with the server.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "../lib/api/bookmarks";
import { queryClient } from "../lib/query-client";
import { useFolderTokenStore } from "../store/folder-tokens";
import { qk } from "../lib/api/query-keys";
import {
  prependBookmarkToPages,
  removeBookmarkFromPages,
  updateBookmarkInPages,
} from "../lib/cache-helpers";
import { DEFAULT_PAGE_SIZE, type BookmarkDetailDto, type BookmarkDto, type FolderDto } from "@ordo/shared";

/** Decrement a folder's bookmarkCount + unreadCount in the folders cache. No-op for unfiled (null). */
function bumpFolderCount(id: string | null, bookmarkDelta: number, unreadDelta: number) {
  if (!id) return;
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

export function useInfiniteBookmarks(folderId: string | null, enabled = true) {
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

export function useBookmarkDetail(id: string, enabled = true, folderId?: string | null) {
  return useQuery({
    queryKey: qk.bookmark(id),
    queryFn: () => bookmarksApi.detail(id, folderId),
    enabled: !!id && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, folderId }: { url: string; folderId: string | null }) =>
      bookmarksApi.create(url, folderId),
    onSuccess: (bookmark) => {
      prependBookmarkToPages(qc, qk.bookmarks(bookmark.folderId), bookmark);
      bumpFolderCount(bookmark.folderId, +1, bookmark.isRead ? 0 : +1);
    },
  });
}

export function useToggleRead(folderId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      bookmarksApi.update(id, { isRead }, { folderId }),
    onMutate: ({ id, isRead }) => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      const prevFolders = qc.getQueryData<FolderDto[]>(qk.folders);
      updateBookmarkInPages(qc, qk.bookmarks(folderId), id, (b) => ({ ...b, isRead }));
      bumpFolderCount(folderId, 0, isRead ? -1 : +1);
      return { prev, prevFolders };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
      if (ctx?.prevFolders) qc.setQueryData(qk.folders, ctx.prevFolders);
    },
  });
}

export function useDeleteBookmark(folderId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookmarksApi.remove(id, { folderId }),
    onMutate: (id) => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      const prevFolders = qc.getQueryData<FolderDto[]>(qk.folders);
      let unreadDelta = 0;
      const list = qc.getQueryData<{ pages: { items: BookmarkDto[] }[] }>(qk.bookmarks(folderId));
      const target = list?.pages.flatMap((p) => p.items).find((b) => b.id === id);
      if (target && !target.isRead) unreadDelta = -1;
      removeBookmarkFromPages(qc, qk.bookmarks(folderId), id);
      bumpFolderCount(folderId, -1, unreadDelta);
      return { prev, prevFolders };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
      if (ctx?.prevFolders) qc.setQueryData(qk.folders, ctx.prevFolders);
    },
  });
}

export function useMoveBookmark(fromFolderId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toFolderId }: { id: string; toFolderId: string | null }) =>
      bookmarksApi.update(id, { folderId: toFolderId }, {
        folderId:
          toFolderId && useFolderTokenStore.getState().get(toFolderId)
            ? toFolderId
            : fromFolderId,
      }),
    onMutate: ({ id, toFolderId }) => {
      const prev = qc.getQueryData(qk.bookmarks(fromFolderId));
      const prevDestination = qc.getQueryData(qk.bookmarks(toFolderId));
      const prevFolders = qc.getQueryData<FolderDto[]>(qk.folders);
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
      return { prev, prevDestination, prevFolders, toFolderId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(fromFolderId), ctx.prev);
      if (ctx?.prevDestination) qc.setQueryData(qk.bookmarks(ctx.toFolderId), ctx.prevDestination);
      if (ctx?.prevFolders) qc.setQueryData(qk.folders, ctx.prevFolders);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useMarkAllRead(folderId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookmarksApi.markAllRead(folderId),
    onMutate: () => {
      const prev = qc.getQueryData(qk.bookmarks(folderId));
      const prevFolders = qc.getQueryData<FolderDto[]>(qk.folders);
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
      // Zero out the folder's unread count (unfiled root has no folder cache entry).
      if (folderId) {
        queryClient.setQueryData<FolderDto[]>(qk.folders, (old) =>
          (old ?? []).map((f) => (f.id === folderId ? { ...f, unreadCount: 0 } : f)),
        );
      }
      return { prev, prevFolders };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.bookmarks(folderId), ctx.prev);
      if (ctx?.prevFolders) qc.setQueryData(qk.folders, ctx.prevFolders);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.bookmarks(folderId) });
      void queryClient.refetchQueries({ queryKey: qk.folders });
    },
  });
}

export type { BookmarkDetailDto };
