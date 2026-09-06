/**
 * Screen header with optional back button, title, and trailing action.
 * Large tab headers and compact pushed headers share one title slot so
 * "Bookmarks" and a folder name sit on the same line when you navigate.
 */
import React from "react";
import { Pressable, StyleSheet, View, type TextStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { layout, spacing } from "../../theme/tokens";
import { useResponsiveLayout } from "../../hooks/use-responsive-layout";

/** Matches `Text` variant "header" line height (14px × 1.5). */
const HEADER_LINE_HEIGHT = 21;
/** Clears the 36px back control and a pair of 32px trailing icons. */
const TITLE_SLOT_INSET = 48;

const titleMetrics: TextStyle = {
  width: "100%",
  includeFontPadding: false,
  textAlignVertical: "center",
};

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
  safeTop?: boolean;
  maxWidth?: number;
  /** Hairline under the header so scrolling content does not collide with it. */
  divider?: boolean;
  onTitleLongPress?: () => void;
  titleAccessibilityHint?: string;
}

export function Header({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  large,
  safeTop = true,
  maxWidth = layout.maxLibraryWidth,
  divider = false,
  onTitleLongPress,
  titleAccessibilityHint,
}: HeaderProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsiveLayout();
  const router = useRouter();
  const topInset = safeTop ? insets.top : 0;
  // Both header sizes share the screen's 16px horizontal padding so titles,
  // controls, and page content align on the same edge.
  const sidePad = Math.max(insets.left, spacing[16]);
  const endPad = Math.max(insets.right, spacing[16]);
  const showLarge = large && (!isLandscape || isTablet);

  const handleBack = () => {
    haptics.light();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const titleEl = (
    <Text variant="header" align="center" numberOfLines={1} style={titleMetrics}>
      {title}
    </Text>
  );
  const titleBlock = onTitleLongPress ? (
    <Pressable
      onLongPress={onTitleLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={titleAccessibilityHint}
      style={styles.titleHit}
    >
      {titleEl}
    </Pressable>
  ) : (
    titleEl
  );

  return (
    <View
      style={[
        styles.wrap,
        {
          maxWidth,
          paddingTop: topInset + spacing[4],
          paddingLeft: sidePad,
          paddingRight: endPad,
          borderBottomColor: palette.border,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {showLarge && right ? (
        <View style={[styles.largeRight, { top: topInset - spacing[2], right: endPad }]}>
          {right}
        </View>
      ) : null}

      <View style={styles.titleRow}>
        {!showLarge && showBack ? (
          <PressableScale
            style={[styles.backBtn, styles.overlay, styles.overlayLeft]}
            scaleTo={0.85}
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </PressableScale>
        ) : null}

        <View
          pointerEvents={onTitleLongPress ? "auto" : "none"}
          style={styles.titleSlot}
        >
          {titleBlock}
        </View>

        {!showLarge && right ? (
          <View style={[styles.overlay, styles.overlayRight]}>{right}</View>
        ) : null}
      </View>

      {subtitle ? (
        <Text
          variant="footnote"
          color="secondary"
          align="center"
          numberOfLines={1}
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: spacing[6],
  },
  titleRow: {
    height: HEADER_LINE_HEIGHT,
    justifyContent: "center",
  },
  titleSlot: {
    ...StyleSheet.absoluteFillObject,
    left: TITLE_SLOT_INSET,
    right: TITLE_SLOT_INSET,
    alignItems: "center",
    justifyContent: "center",
  },
  titleHit: { width: "100%", height: "100%", justifyContent: "center" },
  subtitle: {
    width: "100%",
    marginTop: spacing[2],
    paddingHorizontal: TITLE_SLOT_INSET,
    includeFontPadding: false,
  },
  backBtn: { width: 36, height: 32, alignItems: "center", justifyContent: "center" },
  overlay: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    zIndex: 1,
  },
  overlayLeft: { left: 0 },
  overlayRight: { right: 0, height: 32, justifyContent: "center" },
  largeRight: { position: "absolute", height: 32, justifyContent: "center", zIndex: 1 },
});
