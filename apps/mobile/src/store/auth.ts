/**
 * Auth store: the current user + opaque token pair.
 * Tokens live in expo-secure-store (Keychain/Keystore), NOT AsyncStorage.
 *
 * Tokens are opaque (sha256-hashed server-side); we cannot decode expiry, so the
 * API client schedules proactive refresh and treats `token_expired` 401s as the
 * fallback trigger.
 */
import { create } from "zustand";
import { normalizeReaderPreferences, type AuthTokens, type UserDto } from "@ordo/shared";
import { secureGet, secureSet, secureDelete, StorageKeys } from "../lib/storage";

/** Accept current UserDto rows and older persisted sessions that still have `username`. */
export function normalizePersistedUser(raw: unknown): UserDto | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (typeof u.id !== "string" || typeof u.email !== "string") return null;
  const displayName =
    typeof u.displayName === "string" && u.displayName.trim()
      ? u.displayName
      : typeof u.username === "string"
        ? u.username
        : "";
  if (!displayName) return null;
  return {
    id: u.id,
    displayName,
    email: u.email,
    emailVerified: Boolean(u.emailVerified),
    hasAvatar: Boolean(u.hasAvatar),
    avatarUpdatedAt: typeof u.avatarUpdatedAt === "string" ? u.avatarUpdatedAt : null,
    mfaEnabled: Boolean(u.mfaEnabled),
    preferences: normalizeReaderPreferences(u.preferences),
    createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date(0).toISOString(),
  };
}

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
    const user = normalizePersistedUser(saved?.user);
    if (user && saved?.tokens?.accessToken && saved?.tokens?.refreshToken) {
      const session = { user, tokens: saved.tokens };
      set({ ...session, status: "authenticated" });
      void secureSet(StorageKeys.AUTH, session);
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
