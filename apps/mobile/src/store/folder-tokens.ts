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
  /** Bumped whenever token access changes (unlock/expiry) so global query
   *  keys that depend on folder visibility can refetch. */
  accessRevision: number;
  hydrate: () => Promise<void>;
  /** Returns a live token, or null if none/expired. */
  get: (folderId: string) => string | null;
  /** All currently live tokens (for global scope requests). */
  liveTokens: () => string[];
  set: (folderId: string, token: string, expiresInSec: number) => void;
  clear: (folderId: string) => void;
  clearAll: () => Promise<void>;
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

let pruneScheduled = false;

function schedulePrune() {
  if (pruneScheduled) return;
  pruneScheduled = true;
  queueMicrotask(() => {
    pruneScheduled = false;
    const current = useFolderTokenStore.getState().tokens;
    const next = prune(current);
    if (next === current) return;
    useFolderTokenStore.setState((s) => ({
      tokens: next,
      accessRevision: s.accessRevision + 1,
    }));
    void secureSet(StorageKeys.FOLDER_TOKENS, next);
  });
}

export const useFolderTokenStore = create<FolderTokenState>((set, get) => ({
  tokens: {},
  accessRevision: 0,

  hydrate: async () => {
    const saved = await secureGet<FolderTokenMap>(StorageKeys.FOLDER_TOKENS);
    set((s) => ({ tokens: saved ? prune(saved) : {}, accessRevision: s.accessRevision + 1 }));
  },

  get: (folderId) => {
    const entry = get().tokens[folderId];
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      schedulePrune();
      return null;
    }
    return entry.token;
  },

  liveTokens: () => {
    const t = now();
    const live: string[] = [];
    let expired = false;
    for (const entry of Object.values(get().tokens)) {
      if (entry.expiresAt > t) live.push(entry.token);
      else expired = true;
    }
    if (expired) schedulePrune();
    return live;
  },

  set: (folderId, token, expiresInSec) => {
    const next = { ...get().tokens, [folderId]: { token, expiresAt: now() + expiresInSec * 1000 } };
    set((s) => ({ tokens: next, accessRevision: s.accessRevision + 1 }));
    void secureSet(StorageKeys.FOLDER_TOKENS, next);
  },

  clear: (folderId) => {
    const next = { ...get().tokens };
    delete next[folderId];
    set((s) => ({ tokens: next, accessRevision: s.accessRevision + 1 }));
    void secureSet(StorageKeys.FOLDER_TOKENS, next);
  },

  clearAll: async () => {
    set((s) => ({ tokens: {}, accessRevision: s.accessRevision + 1 }));
    await secureSet(StorageKeys.FOLDER_TOKENS, {});
  },
}));
