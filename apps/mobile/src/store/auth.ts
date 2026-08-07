/**
 * Auth store: the current user + opaque token pair.
 * Tokens live in expo-secure-store (Keychain/Keystore), NOT AsyncStorage.
 *
 * Tokens are opaque (sha256-hashed server-side); we cannot decode expiry, so the
 * API client schedules proactive refresh and treats `token_expired` 401s as the
 * fallback trigger.
 */
import { create } from "zustand";
import { secureGet, secureSet, secureDelete, StorageKeys } from "../lib/storage";
import type { AuthTokens, UserDto } from "@ordo/shared";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface PersistedAuth {
  user: UserDto;
  tokens: AuthTokens;
}

export interface AuthState {
  user: UserDto | null;
  tokens: AuthTokens | null;
  status: AuthStatus;

  hydrate: () => Promise<void>;
  setSession: (session: PersistedAuth) => void;
  /** Replace only the token pair (used after transparent refresh). */
  setTokens: (tokens: AuthTokens) => void;
  /** Replace only the user (used after profile edits). */
  setUser: (user: UserDto) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  status: "loading",

  hydrate: async () => {
    const saved = await secureGet<PersistedAuth>(StorageKeys.AUTH);
    if (saved?.user && saved?.tokens?.accessToken && saved?.tokens?.refreshToken) {
      set({ user: saved.user, tokens: saved.tokens, status: "authenticated" });
    } else {
      set({ user: null, tokens: null, status: "unauthenticated" });
    }
  },

  setSession: (session) => {
    set({ ...session, status: "authenticated" });
    void secureSet(StorageKeys.AUTH, session);
  },

  setTokens: (tokens) => {
    const user = get().user;
    if (!user) return;
    set({ tokens });
    void secureSet(StorageKeys.AUTH, { user, tokens });
  },

  setUser: (user) => {
    const tokens = get().tokens;
    if (!tokens) return;
    set({ user });
    void secureSet(StorageKeys.AUTH, { user, tokens });
  },

  clear: async () => {
    set({ user: null, tokens: null, status: "unauthenticated" });
    await secureDelete(StorageKeys.AUTH);
  },
}));
