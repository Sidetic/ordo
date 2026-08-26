/**
 * ThemeProvider: resolves the active palette from the settings store
 * (theme mode + AMOLED flag) and the device color scheme, then exposes it via
 * context. Also keeps the status bar style in sync.
 */
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSettingsStore } from "../store/settings";
import {
  resolvePalette,
  resolveShadows,
  type Palette,
  type Shadows,
} from "./theme";

interface ThemeContextValue {
  palette: Palette;
  shadows: Shadows;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const amoled = useSettingsStore((s) => s.amoled);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const palette = resolvePalette(themeMode, amoled, systemScheme);
    return { palette, shadows: resolveShadows(palette) };
  }, [themeMode, amoled, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={value.palette.mode === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

/**
 * Overrides the ambient palette for a subtree — e.g. the reader surface,
 * which themes itself independently of the app theme. Every nested
 * `useTheme()` consumer (Text, sheets, buttons…) picks up the override.
 */
export function ThemeOverrideProvider({
  palette,
  children,
}: {
  palette: Palette;
  children: React.ReactNode;
}) {
  const value = useMemo<ThemeContextValue>(
    () => ({ palette, shadows: resolveShadows(palette) }),
    [palette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
