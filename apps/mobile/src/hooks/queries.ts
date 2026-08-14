/**
 * Read-side React Query hooks.
 */
import { useQuery } from "@tanstack/react-query";
import { normalizeFolderIcon } from "@ordo/shared";
import { authApi } from "../lib/api/auth";
import { serverApi } from "../lib/api/server";
import { foldersApi } from "../lib/api/folders";
import { qk } from "../lib/api/query-keys";
import { useSettingsStore } from "../store/settings";

/** Server info — unauthenticated; keyed by URL so switching servers refetches. */
export function useServerInfo() {
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  return useQuery({
    queryKey: qk.serverInfo(serverUrl),
    queryFn: () => serverApi.info(),
    staleTime: 60_000,
    retry: 1,
  });
}

/** Current user. Enabled only when authenticated. */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => authApi.me(),
    enabled: false, // invoked manually on bootstrap; see useValidateSession
  });
}

/** Validate the persisted session on launch (reconcile local → server). */
export function useValidateSession() {
  return useQuery({
    queryKey: ["auth", "validate"],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: qk.sessions,
    queryFn: () => authApi.listSessions(),
    staleTime: 20_000,
  });
}

export function useFolders() {
  return useQuery({
    queryKey: qk.folders,
    queryFn: async () => {
      const folders = await foldersApi.list();
      return folders.map((folder) => ({
        ...folder,
        icon: normalizeFolderIcon(folder.icon),
        pinned: folder.pinned ?? false,
      }));
    },
    staleTime: 30_000,
  });
}
