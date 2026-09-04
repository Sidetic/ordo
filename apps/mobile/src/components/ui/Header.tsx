/**
 * Screen header with optional back button, title, and trailing action.
 * Compact detail headers keep the title centered on the same row as the
 * controls; large tab headers retain their stacked treatment.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { layout, spacing } from "../../theme/tokens";
import { useResponsiveLayout } from "../../hooks/use-responsive-layout";

const HEADER_LINE_HEIGHT = 21;

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
  /** Colored dot beside the title (tag screens). */
  dotColor?: string;
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
  dotColor,
}: HeaderProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsiveLayout();
  const router = useRouter();
  const topInset = safeTop ? insets.top : 0;
  // Both header sizes share the screen's 16px horizontal padding so titles,
  // controls, and page content align on the same edge.
  const horizontalInsets = {
    paddingLeft: Math.max(insets.left, spacing[16]),
    paddingRight: Math.max(insets.right, spacing[16]),
  };
  const showLarge = large && (!isLandscape || isTablet);

  const handleBack = () => {
    haptics.light();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  const titles = (
    <>
      <View style={styles.titleRow}>
        {dotColor ? <View style={[styles.titleDot, { backgroundColor: dotColor }]} /> : null}
        <Text variant="header" align="center" numberOfLines={1} style={styles.titleText}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text
          variant="footnote"
          color="secondary"
          align="center"
          numberOfLines={1}
          style={showLarge ? { marginTop: spacing[2] } : undefined}
        >
          {subtitle}
        </Text>
      ) : null}
    </>
  );
  const titleBlock = onTitleLongPress ? (
    <Pressable
      onLongPress={onTitleLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={titleAccessibilityHint}
      style={showLarge ? undefined : styles.compactTitleHit}
    >
      {titles}
    </Pressable>
  ) : (
    titles
  );

  if (showLarge) {
    return (
      <View
        style={[
          styles.largeWrap,
          {
            maxWidth,
            paddingTop: topInset + spacing[4],
            paddingLeft: Math.max(insets.left, spacing[16]),
            paddingRight: Math.max(insets.right, spacing[16]),
            borderBottomColor: palette.border,
            borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {right ? (
          <View
            style={[
              styles.largeRight,
              { top: topInset - spacing[2], right: Math.max(insets.right, spacing[16]) },
            ]}
          >
            {right}
          </View>
        ) : null}
        <View style={[styles.largeTitles, !subtitle && styles.singleLineTitle]}>
          {titleBlock}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.compactWrap,
        horizontalInsets,
        { maxWidth, paddingTop: topInset + spacing[4], borderBottomColor: palette.border, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0 },
      ]}
    >
      <View style={[styles.compactRow, subtitle && styles.compactRowWithSubtitle]}>
        {showBack ? (
          <PressableScale
            style={[styles.backBtn, styles.compactLeft]}
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
          style={styles.compactTitle}
        >
          {titleBlock}
        </View>
        {right ? <View style={styles.compactRight}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  largeWrap: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: spacing[6],
  },
  compactWrap: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: spacing[6],
  },
  compactRow: { height: 32, justifyContent: "center" },
  compactRowWithSubtitle: { height: 40 },
  backBtn: { width: 36, height: 32, alignItems: "center", justifyContent: "center" },
  compactLeft: { position: "absolute", left: 0, top: "50%", marginTop: -16, zIndex: 1 },
  compactRight: { position: "absolute", right: 0, top: "50%", marginTop: -16, height: 32, justifyContent: "center", zIndex: 1 },
  largeRight: { position: "absolute", height: 32, justifyContent: "center", zIndex: 1 },
  largeTitles: { alignItems: "center" },
  singleLineTitle: { height: HEADER_LINE_HEIGHT, justifyContent: "center" },
  compactTitle: { position: "absolute", top: 0, bottom: 0, left: 48, right: 48, alignItems: "center", justifyContent: "center" },
  compactTitleHit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    maxWidth: "100%",
  },
  titleText: { flexShrink: 1 },
  titleDot: { width: 8, height: 8, borderRadius: 9999, flexShrink: 0 },
});
