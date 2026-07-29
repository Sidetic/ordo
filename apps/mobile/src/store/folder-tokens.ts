/**
 * Cache of short-lived folder unlock tokens, keyed by folderId.
 * Folder tokens are folder-scoped and expire after 10 minutes; `get` returns
 * null once expired so the caller can re-prompt + re-unlock.
 */
import { create } from "zustand";
import { secureGet, secureSet, StorageKeys } from "../lib/storage";

interface FolderTokenEntry {
  token: string;
  /** Epoch ms when the token expires. */
  expiresAt: number;
}

type FolderTokenMap = Record<string, FolderTokenEntry>;

export interface FolderTokenState {
  tokens: FolderTokenMap;
  hydrate: () => Promise<void>;
  /** Returns a live token, or null if none/expired. */
  get: (folderId: string) => string | null;
  set: (folderId: string, token: string, expiresInSec: number) => void;
  clear: (folderId: string) => void;
  clearAll: () => void;
}

const now = () => Date.now();

function prune(map: FolderTokenMap): FolderTokenMap {
  const t = now();
  const next: FolderTokenMap = {};
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (v.expiresAt > t) next[k] = v;
    else changed = true;
  }
  return changed ? next : map;
}

export const useFolderTokenStore = create<FolderTokenState>((set, get) => ({
  tokens: {},

  hydrate: async () => {
    const saved = await secureGet<FolderTokenMap>(StorageKeys.FOLDER_TOKENS);
    set({ tokens: saved ? prune(saved) : {} });
  },

  get: (folderId) => {
    const entry = get().tokens[folderId];
    if (!entry || entry.expiresAt <= now()) return null;
    return entry.token;
  },

  set: (folderId, token, expiresInSec) => {
    const next = { ...get().tokens, [folderId]: { token, expiresAt: now() + expiresInSec * 1000 } };
    set({ tokens: next });
    void secureSet(StorageKeys.FOLDER_TOKENS, next);
  },

  clear: (folderId) => {
    const next = { ...get().tokens };
    delete next[folderId];
    set({ tokens: next });
    void secureSet(StorageKeys.FOLDER_TOKENS, next);
  },

  clearAll: () => {
    set({ tokens: {} });
    void secureSet(StorageKeys.FOLDER_TOKENS, {});
  },
}));
