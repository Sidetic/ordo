/**
 * Centralised React Query key factory. Keeps cache keys stable & typed.
 */
import type { CursorPage } from "@ordo/shared";

export const qk = {
  me: ["auth", "me"] as const,
  sessions: ["auth", "sessions"] as const,
  serverInfo: (url?: string) => ["server", "info", url ?? null] as const,

  folders: ["folders"] as const,
  folder: (id: string) => ["folders", id] as const,

  /** `folderId` is null for the unfiled root list ("Bookmarks"). */
  bookmarks: (folderId: string | null) => ["bookmarks", folderId ?? null] as const,
  bookmark: (id: string) => ["bookmarks", "detail", id] as const,
  search: (q: string) => ["bookmarks", "search", q] as const,
} as const;

export type PageParam = { cursor: string | null };

/** Flatten an infinite list of pages into a single items array. */
export function flattenPages<T>(pages: CursorPage<T>[]): T[] {
  return pages.flatMap((p) => p.items);
}
