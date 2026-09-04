import type { BookmarkDto, ContentKind } from "@ordo/shared";
import { bookmarkContentKind } from "@ordo/shared";

export function resolveContentKind(bookmark: BookmarkDto): ContentKind | null {
  return bookmark.contentKind ?? bookmarkContentKind(bookmark.fetchStatus, bookmark.extractionReason);
}

/** Non-article destinations open the in-app website view, not the reader. */
export function bookmarkOpensAsWebsite(bookmark: BookmarkDto): boolean {
  const kind = resolveContentKind(bookmark);
  return kind === "web" || kind === "media" || kind === "file";
}

export function canReadInOrdo(bookmark: BookmarkDto): boolean {
  return bookmark.fetchStatus === "ok";
}
