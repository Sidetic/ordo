/**
 * Folders API endpoints.
 */
import { FolderRoutes, buildPath, type ExportFormat } from "@ordo/shared";
import { api } from "./client";

export const foldersApi = {
  list: () => api.get<typeof FolderRoutes.list.response>(FolderRoutes.list.path),

  create: (name: string) =>
    api.post<typeof FolderRoutes.create.response>(FolderRoutes.create.path, { name }),

  update: (id: string, name: string) =>
    api.patch<typeof FolderRoutes.update.response>(buildPath(FolderRoutes.update.path, { id }), {
      name,
    }),

  remove: (id: string) =>
    api.delete<typeof FolderRoutes.remove.response>(buildPath(FolderRoutes.remove.path, { id })),

  setPassword: (id: string, password: string) =>
    api.post<typeof FolderRoutes.setPassword.response>(
      buildPath(FolderRoutes.setPassword.path, { id }),
      { password },
    ),

  removePassword: (id: string) =>
    api.delete<typeof FolderRoutes.removePassword.response>(
      buildPath(FolderRoutes.removePassword.path, { id }),
    ),

  unlock: (id: string, password: string) =>
    api.post<{ token: string; expiresIn: number }>(buildPath(FolderRoutes.unlock.path, { id }), {
      password,
    }),

  /** File download (JSON/HTML). Returns the raw Response. */
  export: (id: string, format: ExportFormat) =>
    api.raw(buildPath(FolderRoutes.export.path, { id }), {
      query: { format },
      folderId: id,
    }),
};
