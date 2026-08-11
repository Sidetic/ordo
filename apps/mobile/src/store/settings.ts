/**
 * Client/UI settings store: server URL, theme mode, AMOLED and navigation preferences.
 * Persisted to AsyncStorage (non-secret). Hydrated explicitly on app start.
 */
import { create } from "zustand";
import { prefsGet, prefsSet, StorageKeys } from "../lib/storage";
import type { ThemeMode } from "../theme/theme";

export const DEFAULT_SERVER_URL = "http://localhost:3000";
export type NavigationStyle = "docked" | "floating" | "compactFloating";

export interface SettingsState {
  serverUrl: string;
  themeMode: ThemeMode;
  amoled: boolean;
  navigationStyle: NavigationStyle;
  showNavigationLabels: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setAmoled: (on: boolean) => void;
  setNavigationStyle: (style: NavigationStyle) => void;
  setShowNavigationLabels: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  serverUrl: DEFAULT_SERVER_URL,
  themeMode: "system",
  amoled: false,
  navigationStyle: "docked",
  showNavigationLabels: true,
  hydrated: false,

  hydrate: async () => {
    const saved = await prefsGet<Partial<SettingsState>>(StorageKeys.SETTINGS);
    set({
      serverUrl: saved?.serverUrl?.trim() || DEFAULT_SERVER_URL,
      themeMode: saved?.themeMode ?? "system",
      amoled: saved?.amoled ?? false,
      navigationStyle:
        saved?.navigationStyle === "floating" || saved?.navigationStyle === "compactFloating"
          ? saved.navigationStyle
          : "docked",
      showNavigationLabels: saved?.showNavigationLabels !== false,
      hydrated: true,
    });
  },

  setServerUrl: async (url) => {
    set({ serverUrl: url });
    await prefsSet(StorageKeys.SETTINGS, { ...get(), serverUrl: url });
  },
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), themeMode: mode });
  },
  setAmoled: (on) => {
    set({ amoled: on });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), amoled: on });
  },
  setNavigationStyle: (navigationStyle) => {
    set({ navigationStyle });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), navigationStyle });
  },
  setShowNavigationLabels: (showNavigationLabels) => {
    set({ showNavigationLabels });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), showNavigationLabels });
  },
}));
