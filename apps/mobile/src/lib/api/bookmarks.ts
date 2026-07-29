/**
 * Bookmarks API endpoints.
 */
import { BookmarkRoutes, buildPath } from "@ordo/shared";
import { api } from "./client";

export interface ListBookmarksParams {
  folderId: string;
  cursor?: string | null;
  limit?: number;
}

export const bookmarksApi = {
  create: (url: string, folderId: string) =>
    api.post<typeof BookmarkRoutes.create.response>(BookmarkRoutes.create.path, {
      url,
      folderId,
    }),

  list: ({ folderId, cursor, limit }: ListBookmarksParams) =>
    api.get<typeof BookmarkRoutes.list.response>(BookmarkRoutes.list.path, {
      query: { folderId, cursor, limit },
      folderId,
    }),

  search: (q: string, cursor?: string | null, limit?: number) =>
    api.get<typeof BookmarkRoutes.search.response>(BookmarkRoutes.search.path, {
      query: { q, cursor, limit },
      auth: true,
    }),

  detail: (id: string) =>
    api.get<typeof BookmarkRoutes.detail.response>(buildPath(BookmarkRoutes.detail.path, { id })),

  update: (
    id: string,
    body: { folderId?: string; isRead?: boolean },
    opts?: { folderId?: string },
  ) =>
    api.patch<typeof BookmarkRoutes.update.response>(
      buildPath(BookmarkRoutes.update.path, { id }),
      body,
      opts,
    ),

  remove: (id: string, opts?: { folderId?: string }) =>
    api.delete<typeof BookmarkRoutes.remove.response>(
      buildPath(BookmarkRoutes.remove.path, { id }),
      opts,
    ),

  markAllRead: (folderId: string) =>
    api.post<typeof BookmarkRoutes.markAllRead.response>(BookmarkRoutes.markAllRead.path, {
      folderId,
    }),
};
