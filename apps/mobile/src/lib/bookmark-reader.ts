import type { BookmarkDto, ContentKind } from "@ordo/shared";
import { bookmarkContentKind } from "@ordo/shared";

export function resolveContentKind(bookmark: BookmarkDto): ContentKind | null {
  return (
    bookmark.contentKind ??
    bookmarkContentKind(bookmark.fetchStatus, bookmark.extractionReason, bookmark.contentKindOverride ?? null)
  );
}

export function bookmarkIsArticle(bookmark: BookmarkDto): boolean {
  return resolveContentKind(bookmark) === "article";
}

/** Files and social/app destinations cannot be extracted as articles. */
export function bookmarkCanBeArticle(bookmark: BookmarkDto): boolean {
  const kind = resolveContentKind(bookmark);
  return kind !== "media" && kind !== "file";
}

/** Non-article destinations open the in-app website view, not the reader. */
export function bookmarkOpensAsWebsite(bookmark: BookmarkDto): boolean {
  const kind = resolveContentKind(bookmark);
  return kind === "web" || kind === "media" || kind === "file";
}

export function canReadInOrdo(bookmark: BookmarkDto): boolean {
  return bookmark.fetchStatus === "ok";
}
