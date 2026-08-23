/**
 * Client/UI settings store: server URL, theme mode, AMOLED and navigation preferences.
 * Persisted to AsyncStorage (non-secret). Hydrated explicitly on app start.
 */
import { create } from "zustand";
import { prefsGet, prefsSet, StorageKeys } from "../lib/storage";
import type { ThemeMode } from "../theme/theme";

export const DEFAULT_SERVER_URL = "http://localhost:3000";
export type NavigationStyle = "docked" | "floating" | "compactFloating";
export type CreateButtonAction = "menu" | "bookmark" | "folder";
export type CreateButtonHoldAction = CreateButtonAction | "none";

function isCreateButtonAction(value: unknown): value is CreateButtonAction {
  return value === "menu" || value === "bookmark" || value === "folder";
}

export interface SettingsState {
  serverUrl: string;
  themeMode: ThemeMode;
  amoled: boolean;
  navigationStyle: NavigationStyle;
  showNavigationLabels: boolean;
  createButtonTapAction: CreateButtonAction;
  createButtonHoldAction: CreateButtonHoldAction;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setAmoled: (on: boolean) => void;
  setNavigationStyle: (style: NavigationStyle) => void;
  setShowNavigationLabels: (show: boolean) => void;
  setCreateButtonTapAction: (action: CreateButtonAction) => void;
  setCreateButtonHoldAction: (action: CreateButtonHoldAction) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  serverUrl: DEFAULT_SERVER_URL,
  themeMode: "system",
  amoled: false,
  navigationStyle: "docked",
  showNavigationLabels: true,
  createButtonTapAction: "menu",
  createButtonHoldAction: "bookmark",
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
      createButtonTapAction: isCreateButtonAction(saved?.createButtonTapAction)
        ? saved.createButtonTapAction
        : "menu",
      createButtonHoldAction:
        saved?.createButtonHoldAction === "none" || isCreateButtonAction(saved?.createButtonHoldAction)
          ? saved.createButtonHoldAction
          : "bookmark",
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
  setCreateButtonTapAction: (createButtonTapAction) => {
    set({ createButtonTapAction });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), createButtonTapAction });
  },
  setCreateButtonHoldAction: (createButtonHoldAction) => {
    set({ createButtonHoldAction });
    void prefsSet(StorageKeys.SETTINGS, { ...get(), createButtonHoldAction });
  },
}));
