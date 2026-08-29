/** Shared user-facing phrases used in more than one screen. */

export function markedAsReadToast(count: number): string {
  return count === 1 ? "1 bookmark marked as read" : `${count} bookmarks marked as read`;
}
