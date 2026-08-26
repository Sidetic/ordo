import type { BookmarkDto } from "@ordo/shared";

/** Terminal extraction outcomes should bypass reader navigation entirely. */
export function opensBookmarkExternally(bookmark: BookmarkDto): boolean {
  return bookmark.fetchStatus === "unsupported" || bookmark.fetchStatus === "failed";
}
