/**
 * Client/UI settings store: server URL, theme mode, AMOLED toggle.
 * Persisted to AsyncStorage (non-secret). Hydrated explicitly on app start.
 */
import { create } from "zustand";
import { prefsGet, prefsSet, StorageKeys } from "../lib/storage";
import type { ThemeMode } from "../theme/theme";

export const DEFAULT_SERVER_URL = "http://localhost:3000";

export interface SettingsState {
  serverUrl: string;
  themeMode: ThemeMode;
  amoled: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setServerUrl: (url: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAmoled: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  serverUrl: DEFAULT_SERVER_URL,
  themeMode: "system",
  amoled: false,
  hydrated: false,

  hydrate: async () => {
    const saved = await prefsGet<Partial<SettingsState>>(StorageKeys.SETTINGS);
    set({
      serverUrl: saved?.serverUrl?.trim() || DEFAULT_SERVER_URL,
      themeMode: saved?.themeMode ?? "system",
      amoled: saved?.amoled ?? false,
      hydrated: true,
    });
  },

  setServerUrl: (url) => {
    set({ serverUrl: url });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), serverUrl: url });
  },
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), themeMode: mode });
  },
  setAmoled: (on) => {
    set({ amoled: on });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), amoled: on });
  },
}));
