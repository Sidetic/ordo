/**
 * Design tokens — the single source of truth for spacing, radius, elevation,
 * typography, and motion. Every surface in the app derives from these.
 */

/** Spacing scale (px). Multiply by the unit when consuming. */
export const spacing = {
  0: 0,
  px: 1,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
  80: 80,
} as const;

export type Spacing = keyof typeof spacing;
export const UNIT = 1;

/** Corner radius scale (px). */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 28,
  full: 9999,
} as const;
export type Radius = keyof typeof radius;

/** Typography sizes (px). */
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
  "5xl": 40,
} as const;
export type FontSize = keyof typeof fontSize;

/** Line heights relative to size. */
export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 1.8,
} as const;

/** Font weights. */
export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

/** Layout constants. */
export const layout = {
  screenHorizontalPad: 16,
  touchTargetMin: 44,
  tabBarHeight: 52,
  maxContentWidth: 640,
} as const;

/**
 * Elevation shadows. Three discrete levels keep the system consistent.
 * `elevation` is Android-only; `shadow*` is iOS-only.
 */
export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export function makeShadow(color: string, level: 1 | 2 | 3): Shadow {
  const presets = {
    1: { offset: { width: 0, height: 1 }, opacity: 0.06, blur: 3, elevation: 1 },
    2: { offset: { width: 0, height: 4 }, opacity: 0.08, blur: 12, elevation: 3 },
    3: { offset: { width: 0, height: 12 }, opacity: 0.12, blur: 28, elevation: 8 },
  } as const;
  const p = presets[level];
  return {
    shadowColor: color,
    shadowOffset: p.offset,
    shadowOpacity: p.opacity,
    shadowRadius: p.blur,
    elevation: p.elevation,
  };
}

/** Motion: spring presets for Reanimated (physics-based, not durations). */
export const springs = {
  /** Fast, settled, no overshoot — default for UI feedback. */
  snappy: { damping: 26, stiffness: 320, mass: 0.9 },
  /** Soft, natural motion — screen transitions, modals. */
  gentle: { damping: 22, stiffness: 160, mass: 1 },
  /** Playful bounce — confirmations, deletions. */
  bouncy: { damping: 13, stiffness: 180, mass: 0.9 },
} as const;

/** Timing presets (ms) for the rare non-spring animation (e.g. opacity fades). */
export const timing = {
  fast: 160,
  normal: 240,
  slow: 360,
} as const;
