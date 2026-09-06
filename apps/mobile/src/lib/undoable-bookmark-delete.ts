/**
 * Optimistic bookmark delete with a short undo window. The row leaves the UI
 * immediately; the server delete waits until Undo is skipped (toast dismiss,
 * Done, or closing the sheet).
 */
import type { InfiniteData } from "@tanstack/react-query";
import { BATCH_ITEM_LIMIT, type BookmarkDetailDto, type BookmarkDto, type CursorPage } from "@ordo/shared";
import { toast } from "../components/ui/toast-store";
import { bookmarksApi } from "./api/bookmarks";
import { qk } from "./api/query-keys";
import {
  bumpFolderCount,
  insertBookmarkIfAbsent,
  removeBookmarksEverywhere,
} from "./cache-helpers";
import { deletedBookmarksToast } from "./copy";
import { errorMessage } from "./error-message";
import { haptics } from "./haptics";
import { queryClient } from "./query-client";

const UNDO_MS = 5_500;
const COMMIT_FALLBACK_MS = UNDO_MS + 800;

const pendingIds = new Set<string>();
let stripperStarted = false;

function isPagedBookmarks(
  data: unknown,
): data is InfiniteData<CursorPage<BookmarkDto>, string | null> {
  return !!data && typeof data === "object" && Array.isArray((data as { pages?: unknown }).pages);
}

function ensurePendingStripper() {
  if (stripperStarted) return;
  stripperStarted = true;
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || pendingIds.size === 0) return;
    if (event.query.queryKey[0] !== "bookmarks") return;
    const data = event.query.state.data;
    if (!isPagedBookmarks(data)) return;
    if (!data.pages.some((page) => page.items.some((item) => pendingIds.has(item.id)))) return;
    removeBookmarksEverywhere(queryClient, pendingIds);
  });
}

function listKeyAllowsRestore(queryKey: readonly unknown[], folderId: string | null): boolean {
  if (queryKey[0] !== "bookmarks") return false;
  const scope = queryKey[1];
  if (scope === "detail" || scope === "extraction-progress") return false;
  if (scope === "search" || scope === "tagged") return true;
  return queryKey.length === 2 && scope === folderId;
}

function applyOptimisticDelete(bookmarks: BookmarkDto[]) {
  const details = new Map<string, BookmarkDetailDto | BookmarkDto>();
  for (const bookmark of bookmarks) {
    pendingIds.add(bookmark.id);
    const detail = queryClient.getQueryData<BookmarkDetailDto | BookmarkDto>(qk.bookmark(bookmark.id));
    if (detail) details.set(bookmark.id, detail);
  }
  removeBookmarksEverywhere(queryClient, new Set(bookmarks.map((bookmark) => bookmark.id)));
  for (const bookmark of bookmarks) {
    queryClient.removeQueries({ queryKey: qk.bookmark(bookmark.id) });
    bumpFolderCount(queryClient, bookmark.folderId, -1, bookmark.isRead ? 0 : -1);
  }
  return details;
}

function restoreBookmarks(
  bookmarks: BookmarkDto[],
  details: Map<string, BookmarkDetailDto | BookmarkDto>,
) {
  for (const bookmark of bookmarks) pendingIds.delete(bookmark.id);
  for (const bookmark of bookmarks) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey: ["bookmarks"] })) {
      if (!listKeyAllowsRestore(query.queryKey, bookmark.folderId)) continue;
      insertBookmarkIfAbsent(queryClient, query.queryKey, bookmark);
    }
    bumpFolderCount(queryClient, bookmark.folderId, +1, bookmark.isRead ? 0 : +1);
    const detail = details.get(bookmark.id);
    if (detail) queryClient.setQueryData(qk.bookmark(bookmark.id), detail);
  }
}

async function commitDeletes(bookmarks: BookmarkDto[], scopeFolderId?: string | null) {
  if (bookmarks.length === 1) {
    const bookmark = bookmarks[0];
    await bookmarksApi.remove(bookmark.id, { folderId: bookmark.folderId ?? scopeFolderId ?? null });
  } else {
    const ids = bookmarks.map((bookmark) => bookmark.id);
    for (let i = 0; i < ids.length; i += BATCH_ITEM_LIMIT) {
      const chunk = ids.slice(i, i + BATCH_ITEM_LIMIT);
      await bookmarksApi.batch({ action: "delete", ids: chunk }, { folderId: scopeFolderId });
    }
  }
  for (const bookmark of bookmarks) pendingIds.delete(bookmark.id);
  void queryClient.invalidateQueries({ queryKey: ["tags"] });
  void queryClient.invalidateQueries({ queryKey: ["bookmarks", "tagged"] });
  void queryClient.invalidateQueries({ queryKey: ["bookmarks", "search"] });
}

export function deleteBookmarksUndoable(
  bookmarks: BookmarkDto[],
  opts?: { scopeFolderId?: string | null; onDeleted?: () => void; showToast?: boolean },
): { undo: () => void; commit: () => void } {
  const noop = { undo: () => {}, commit: () => {} };
  const targets = bookmarks.filter((bookmark) => !pendingIds.has(bookmark.id));
  if (targets.length === 0) return noop;

  ensurePendingStripper();
  const details = applyOptimisticDelete(targets);
  opts?.onDeleted?.();

  let settled = false;
  const showToast = opts?.showToast !== false;
  let fallback: ReturnType<typeof setTimeout> | undefined;

  const settle = (undo: boolean) => {
    if (settled) return;
    settled = true;
    if (fallback) clearTimeout(fallback);
    if (undo) {
      haptics.success();
      restoreBookmarks(targets, details);
      return;
    }
    void commitDeletes(targets, opts?.scopeFolderId).catch((cause) => {
      restoreBookmarks(targets, details);
      toast.error(errorMessage(cause));
    });
  };

  if (showToast) {
    fallback = setTimeout(() => settle(false), COMMIT_FALLBACK_MS);
    toast.success(deletedBookmarksToast(targets.length), {
      duration: UNDO_MS,
      action: { label: "Undo", onPress: () => settle(true) },
      onDismiss: () => settle(false),
    });
  }

  return {
    undo: () => settle(true),
    commit: () => settle(false),
  };
}
