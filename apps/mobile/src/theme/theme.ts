/**
 * Color palettes for light, dark, and AMOLED (dark + pure black surfaces).
 * AMOLED is not a separate mode — it overrides dark surfaces when active.
 */
import { makeShadow, type Shadow } from "./tokens";

export type ThemeMode = "light" | "dark" | "system";

export interface Palette {
  mode: "light" | "dark";
  amoled: boolean;

  background: string;
  /** Primary card / sheet surface. */
  surface: string;
  /** Subtle fill for inputs, chips, selected rows. */
  surfaceSecondary: string;
  /** Raised surface (modals, popovers). */
  surfaceElevated: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  border: string;
  borderStrong: string;

  accent: string;
  /** Foreground text drawn on top of `accent`. */
  onAccent: string;
  /** Translucent accent fill for pills/tints. */
  accentSoft: string;

  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;

  /** Dim scrim behind modals/sheets. */
  overlay: string;
}

const light: Palette = {
  mode: "light",
  amoled: false,
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F1F4",
  surfaceElevated: "#FFFFFF",
  text: "#18181B",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E7E7EA",
  borderStrong: "#D1D5DB",
  accent: "#4F46E5",
  onAccent: "#FFFFFF",
  accentSoft: "#EEF2FF",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  overlay: "rgba(9,9,11,0.40)",
};

const dark: Palette = {
  mode: "dark",
  amoled: false,
  background: "#09090B",
  surface: "#18181B",
  surfaceSecondary: "#27272A",
  surfaceElevated: "#1F1F23",
  text: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textTertiary: "#71717A",
  border: "#27272A",
  borderStrong: "#3F3F46",
  accent: "#818CF8",
  onAccent: "#111827",
  accentSoft: "#1E1B4B",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  dangerSoft: "#450A0A",
  overlay: "rgba(0,0,0,0.62)",
};

/** AMOLED: dark palette with pure-black surfaces for OLED battery savings. */
const amoledOverrides: Partial<Palette> = {
  amoled: true,
  background: "#000000",
  surface: "#000000",
  surfaceSecondary: "#0A0A0A",
  surfaceElevated: "#0E0E0E",
  border: "#1C1C1E",
  borderStrong: "#2C2C2E",
  accentSoft: "#161622",
  overlay: "rgba(0,0,0,0.72)",
};

/** Resolve the effective palette from a mode (+ system hint) and amoled flag. */
export function resolvePalette(
  mode: ThemeMode,
  amoled: boolean,
  systemColorScheme: "light" | "dark" | null | undefined,
): Palette {
  const resolvedMode: "light" | "dark" =
    mode === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : mode;
  const base = resolvedMode === "dark" ? dark : light;
  if (resolvedMode === "dark" && amoled) {
    return { ...base, ...amoledOverrides };
  }
  return base;
}

export interface Shadows {
  level1: Shadow;
  level2: Shadow;
  level3: Shadow;
}

export function resolveShadows(p: Palette): Shadows {
  return {
    level1: makeShadow(p.mode === "dark" ? "#000000" : "#27272A", 1),
    level2: makeShadow(p.mode === "dark" ? "#000000" : "#27272A", 2),
    level3: makeShadow(p.mode === "dark" ? "#000000" : "#27272A", 3),
  };
}
