/**
 * Folder queries + mutations (optimistic create/rename/delete).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { foldersApi } from "../lib/api/folders";
import { queryClient } from "../lib/query-client";
import { qk } from "../lib/api/query-keys";
import { errorMessage, isFolderProtected } from "../lib/error-message";
import { toast } from "../components/ui/toast-store";
import type { CreateFolderInput, FolderDto, UpdateFolderInput } from "@ordo/shared";

function sortFolders(folders: FolderDto[]) {
  const [defaultFolder, ...rest] = folders;
  if (!defaultFolder) return [];
  return [
    defaultFolder,
    ...rest.sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt.localeCompare(b.createdAt),
    ),
  ];
}

export { useFolders } from "./queries";

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => foldersApi.create(input),
    onSuccess: (folder) => {
      qc.setQueryData<FolderDto[]>(qk.folders, (old) => sortFolders([...(old ?? []), folder]));
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => foldersApi.update(id, { name }),
    onMutate: ({ id, name }) => {
      const prev = qc.getQueryData<FolderDto[]>(qk.folders);
      qc.setQueryData<FolderDto[]>(qk.folders, (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, name } : f)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.folders, ctx.prev);
    },
    onSuccess: (folder, { id }) => {
      qc.setQueryData<FolderDto[]>(qk.folders, (old) =>
        (old ?? []).map((f) => (f.id === id ? folder : f)),
      );
    },
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) =>
      foldersApi.update(id, input),
    onMutate: ({ id, input }) => {
      const prev = qc.getQueryData<FolderDto[]>(qk.folders);
      qc.setQueryData<FolderDto[]>(qk.folders, (old) =>
        sortFolders((old ?? []).map((folder) => (folder.id === id ? { ...folder, ...input } : folder))),
      );
      return { prev };
    },
    onError: (_error, _variables, context) => {
      if (context?.prev) qc.setQueryData(qk.folders, context.prev);
    },
    onSuccess: (updated) => {
      qc.setQueryData<FolderDto[]>(qk.folders, (old) =>
        sortFolders((old ?? []).map((folder) => (folder.id === updated.id ? updated : folder))),
      );
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foldersApi.remove(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<FolderDto[]>(qk.folders, (old) => (old ?? []).filter((f) => f.id !== id));
    },
  });
}

export interface FolderActionResult {
  ok: boolean;
  error?: string;
}

/** Unlock a protected folder and cache the token. Returns success + message. */
export function useUnlockFolder() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      foldersApi.unlock(id, password),
  });
}

/** Generic folder mutation runner that surfaces a toast on failure. */
export async function runFolderAction<T>(
  fn: () => Promise<T>,
  successMsg?: string,
): Promise<FolderActionResult & { data?: T }> {
  try {
    const data = await fn();
    if (successMsg) toast.success(successMsg);
    return { ok: true, data };
  } catch (e) {
    if (isFolderProtected(e)) return { ok: false, error: "This folder is locked." };
    return { ok: false, error: errorMessage(e) };
  }
}

/** Invalidate all folder + bookmark caches after structural changes. */
export function invalidateBookmarks() {
  void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  void queryClient.invalidateQueries({ queryKey: qk.folders });
}
