/** Shared user-facing phrases used in more than one screen. */
import type { ImportResultDto } from "@ordo/shared";

export function markedAsReadToast(count: number): string {
  return count === 1 ? "1 bookmark marked as read" : `${count} bookmarks marked as read`;
}

export function importedToast(result: ImportResultDto): string {
  if (result.imported === 0 && result.updated === 0) {
    return result.skipped > 0 ? "Everything in that file was already saved" : "Nothing to import";
  }
  const parts: string[] = [];
  if (result.imported > 0) {
    parts.push(result.imported === 1 ? "1 bookmark imported" : `${result.imported} bookmarks imported`);
  }
  if (result.updated > 0) {
    parts.push(result.updated === 1 ? "1 updated" : `${result.updated} updated`);
  }
  if (result.skipped > 0) {
    parts.push(result.skipped === 1 ? "1 already saved" : `${result.skipped} already saved`);
  }
  return parts.join(" · ");
}
