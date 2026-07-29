/**
 * Themed Text with typographic presets. Inherits color from palette by default.
 */
import React from "react";
import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from "react-native";
import { fontSize, fontWeight, lineHeight } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export type TextVariant =
  | "display"
  | "title1"
  | "title2"
  | "title3"
  | "headline"
  | "body"
  | "bodyStrong"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption"
  | "mono";

interface Preset {
  size: number;
  weight: TextStyle["fontWeight"];
  lineHeight: number;
  letterSpacing?: number;
}

const PRESETS: Record<TextVariant, Preset> = {
  display: { size: fontSize["5xl"], weight: fontWeight.bold, lineHeight: lineHeight.tight },
  title1: { size: fontSize["4xl"], weight: fontWeight.bold, lineHeight: lineHeight.tight },
  title2: { size: fontSize["3xl"], weight: fontWeight.bold, lineHeight: lineHeight.snug },
  title3: { size: fontSize["2xl"], weight: fontWeight.semibold, lineHeight: lineHeight.snug },
  headline: { size: fontSize.xl, weight: fontWeight.semibold, lineHeight: lineHeight.normal },
  body: { size: fontSize.md, weight: fontWeight.regular, lineHeight: lineHeight.normal },
  bodyStrong: { size: fontSize.md, weight: fontWeight.semibold, lineHeight: lineHeight.normal },
  callout: { size: fontSize.lg, weight: fontWeight.regular, lineHeight: lineHeight.normal },
  subhead: { size: fontSize.sm, weight: fontWeight.medium, lineHeight: lineHeight.normal },
  footnote: { size: fontSize.sm, weight: fontWeight.regular, lineHeight: lineHeight.normal },
  caption: { size: fontSize.xs, weight: fontWeight.regular, lineHeight: lineHeight.normal, letterSpacing: 0.2 },
  mono: { size: fontSize.sm, weight: fontWeight.regular, lineHeight: lineHeight.normal },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** "primary" | "secondary" | "tertiary" | "accent" | "danger" */
  color?: "primary" | "secondary" | "tertiary" | "accent" | "danger" | "onAccent";
  align?: "auto" | "left" | "center" | "right" | "justify";
}

export function Text({
  variant = "body",
  color = "primary",
  align,
  style,
  ...rest
}: TextProps) {
  const { palette } = useTheme();
  const preset = PRESETS[variant];

  const colorValue = {
    primary: palette.text,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
    accent: palette.accent,
    danger: palette.danger,
    onAccent: palette.onAccent,
  }[color];

  const merged: StyleProp<TextStyle> = [
    {
      color: colorValue,
      fontSize: preset.size,
      fontWeight: preset.weight,
      lineHeight: Math.round(preset.size * preset.lineHeight),
      letterSpacing: preset.letterSpacing,
      textAlign: align,
    },
    style,
  ];

  return <RNText style={merged} {...rest} />;
}
