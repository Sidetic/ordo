/**
 * Sanitized semantic article HTML rendered with native views via
 * react-native-render-html — no WebView, no JavaScript.
 *
 * The server pipeline (Readability → sanitize-html) emits an allowlisted
 * semantic subset (p/headings/lists/blockquote/pre/code/figure/table/links,
 * http(s)/mailto schemes only, no scripts/iframes), so this component's job
 * is purely presentation: token-driven typography scaled by the reader
 * preferences, responsive images, select-to-share text, and external links.
 */
import React, { useMemo } from "react";
import { Linking, StyleSheet } from "react-native";
import RenderHTML, {
  defaultSystemFonts,
  type MixedStyleRecord,
  type RenderersProps,
} from "react-native-render-html";
import { useTheme } from "../../theme/ThemeProvider";
import type { Palette } from "../../theme/theme";
import { resolveFont, spacing, type FontFamily } from "../../theme/tokens";
import type { ReaderFontFamily, ReaderPreferences } from "@ordo/shared";

/** Body text size (px) per preference; headings scale relative to it. */
const BODY_SIZE: Record<ReaderPreferences["fontSize"], number> = {
  small: 15,
  medium: 17,
  large: 19,
  xlarge: 21,
};

/** Reader font preference → loaded font family tokens. */
const FAMILY: Record<ReaderFontFamily, FontFamily> = {
  sans: "sans",
  serif: "serif",
  mono: "mono",
};

/** Custom fonts loaded via useFonts must be registered to avoid warnings. */
const SYSTEM_FONTS = [
  ...defaultSystemFonts,
  "Inter_400Regular",
  "Inter_500Medium",
  "Inter_600SemiBold",
  "Inter_700Bold",
  "InterTight_400Regular",
  "InterTight_500Medium",
  "InterTight_600SemiBold",
  "InterTight_700Bold",
  "JetBrainsMono_400Regular",
  "JetBrainsMono_500Medium",
  "JetBrainsMono_600SemiBold",
  "JetBrainsMono_700Bold",
  "PlayfairDisplay_400Regular",
  "PlayfairDisplay_700Bold",
  "PlayfairDisplay_400Regular_Italic",
];

/** Only http(s)/mailto may leave the app; everything else is ignored. */
export function isExternalHref(href: string): boolean {
  return /^https?:/i.test(href) || /^mailto:/i.test(href);
}

function heading(size: number) {
  return { fontSize: size, lineHeight: Math.round(size * 1.3) };
}

function buildTagsStyles(
  palette: Palette,
  family: FontFamily,
  base: number,
): MixedStyleRecord {
  const bodyFont = (weight = "400") => resolveFont(family, weight);
  const monoSize = Math.max(12, base - 2);
  const cell = {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[10],
    borderColor: palette.border,
    borderWidth: StyleSheet.hairlineWidth,
  };

  return {
    p: {
      fontFamily: bodyFont(),
      fontSize: base,
      lineHeight: Math.round(base * 1.65),
      color: palette.textSecondary,
      marginTop: spacing[14],
      textAlign: "left",
    },
    h1: {
      fontFamily: bodyFont("700"),
      color: palette.text,
      marginTop: spacing[28],
      marginBottom: spacing[6],
      ...heading(base * 1.65),
    },
    h2: {
      fontFamily: bodyFont("700"),
      color: palette.text,
      marginTop: spacing[24],
      marginBottom: spacing[6],
      ...heading(base * 1.45),
    },
    h3: {
      fontFamily: bodyFont("600"),
      color: palette.text,
      marginTop: spacing[20],
      marginBottom: spacing[4],
      ...heading(base * 1.28),
    },
    h4: {
      fontFamily: bodyFont("600"),
      color: palette.text,
      marginTop: spacing[20],
      marginBottom: spacing[4],
      ...heading(base * 1.12),
    },
    h5: { ...heading(base), fontFamily: bodyFont("600"), color: palette.text, marginTop: spacing[16], marginBottom: spacing[4] },
    h6: { ...heading(base * 0.95), fontFamily: bodyFont("600"), color: palette.textTertiary, marginTop: spacing[16], marginBottom: spacing[4] },
    strong: { fontFamily: bodyFont("700"), color: palette.text },
    b: { fontFamily: bodyFont("700"), color: palette.text },
    em: { fontStyle: "italic" },
    i: { fontStyle: "italic" },
    a: { color: palette.accent, textDecorationLine: "underline" },
    ul: { marginTop: spacing[12], marginBottom: spacing[8] },
    ol: { marginTop: spacing[12], marginBottom: spacing[8] },
    li: {
      fontFamily: bodyFont(),
      fontSize: base,
      lineHeight: Math.round(base * 1.6),
      color: palette.textSecondary,
      marginBottom: spacing[6],
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: palette.accent,
      backgroundColor: palette.surfaceSecondary,
      paddingHorizontal: spacing[14],
      paddingVertical: spacing[10],
      borderRadius: 6,
      marginTop: spacing[16],
    },
    pre: {
      fontFamily: resolveFont("mono", "400"),
      fontSize: monoSize,
      lineHeight: Math.round(monoSize * 1.55),
      color: palette.textSecondary,
      backgroundColor: palette.surfaceSecondary,
      paddingHorizontal: spacing[14],
      paddingVertical: spacing[12],
      borderRadius: 10,
      marginTop: spacing[16],
    },
    code: {
      fontFamily: resolveFont("mono", "400"),
      fontSize: monoSize,
      color: palette.text,
      backgroundColor: palette.surfaceSecondary,
    },
    figure: { marginTop: spacing[20], alignItems: "center" },
    figcaption: {
      fontFamily: bodyFont(),
      fontSize: Math.max(11, base - 3),
      lineHeight: Math.round(Math.max(11, base - 3) * 1.45),
      color: palette.textTertiary,
      textAlign: "center",
      marginTop: spacing[6],
    },
    img: { borderRadius: 8 },
    picture: { marginTop: spacing[16] },
    table: { marginTop: spacing[16], borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
    th: {
      ...cell,
      backgroundColor: palette.surfaceSecondary,
      fontFamily: bodyFont("600"),
      fontSize: monoSize,
      color: palette.text,
    },
    td: {
      ...cell,
      fontFamily: bodyFont(),
      fontSize: monoSize,
      color: palette.textSecondary,
    },
    hr: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      marginVertical: spacing[20],
    },
    mark: { backgroundColor: palette.accentSoft, color: palette.text },
    small: { fontSize: Math.max(11, base - 3) },
  };
}

export interface ArticleHtmlProps {
  html: string;
  preferences: ReaderPreferences;
  /** Measured width available to the article; drives responsive images. */
  contentWidth: number;
}

export const ArticleHtml = React.memo(function ArticleHtml({
  html,
  preferences,
  contentWidth,
}: ArticleHtmlProps) {
  const { palette } = useTheme();
  const family = FAMILY[preferences.fontFamily];
  const base = BODY_SIZE[preferences.fontSize];

  const tagsStyles = useMemo(
    () => buildTagsStyles(palette, family, base),
    [palette, family, base],
  );

  // List markers should match the article's font (and accent color).
  const markerTextStyle = useMemo(
    () => ({
      color: palette.accent,
      fontFamily: resolveFont(family, "400"),
      fontSize: base,
    }),
    [palette, family, base],
  );
  const renderersProps = useMemo<Partial<RenderersProps>>(
    () => ({
      a: {
        onPress: (_event, href) => {
          if (isExternalHref(href)) Linking.openURL(href).catch(() => {});
        },
      },
      ul: { markerTextStyle },
      ol: { markerTextStyle },
    }),
    [markerTextStyle],
  );

  if (contentWidth <= 0) return null;

  return (
    <RenderHTML
      source={{ html }}
      contentWidth={contentWidth}
      tagsStyles={tagsStyles}
      renderersProps={renderersProps}
      systemFonts={SYSTEM_FONTS}
      defaultTextProps={{ selectable: true }}
    />
  );
});
