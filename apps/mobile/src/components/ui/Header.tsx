/**
 * Screen header with optional back button, title, and trailing action.
 * Compact detail headers keep the title centered on the same row as the
 * controls; large tab headers retain their stacked treatment.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { layout, spacing } from "../../theme/tokens";
import { useResponsiveLayout } from "../../hooks/use-responsive-layout";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
  safeTop?: boolean;
  maxWidth?: number;
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
}: HeaderProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsiveLayout();
  const router = useRouter();
  const topInset = safeTop ? insets.top : 0;
  const horizontalInsets = {
    paddingLeft: Math.max(insets.left, spacing[4]),
    paddingRight: Math.max(insets.right, spacing[4]),
  };
  const showLarge = large && (!isLandscape || isTablet);

  const handleBack = () => {
    haptics.light();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  if (showLarge) {
    return (
      <View
        style={[
          styles.largeWrap,
          {
            maxWidth,
            paddingTop: topInset + spacing[4],
            paddingLeft: Math.max(insets.left, spacing[12]),
            paddingRight: Math.max(insets.right, spacing[12]),
            borderBottomColor: palette.border,
          },
        ]}
      >
        {right ? (
          <View style={styles.row}>
            <View style={styles.backBtn} />
            <View style={styles.right}>{right}</View>
          </View>
        ) : null}
        <View style={[styles.largeTitles, !right && styles.largeTitlesWithoutControls]}>
          <Text variant="title1" numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text variant="footnote" color="secondary" numberOfLines={1} style={{ marginTop: spacing[2] }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.compactWrap,
        horizontalInsets,
        { maxWidth, paddingTop: topInset + spacing[8], borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.compactRow}>
        {showBack ? (
          <PressableScale style={styles.backBtn} scaleTo={0.85} onPress={handleBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </PressableScale>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View pointerEvents="none" style={styles.compactTitle}>
          <Text variant="header" align="center" numberOfLines={1}>{title}</Text>
        </View>
        {right ? <View style={styles.right}>{right}</View> : <View style={styles.right} />}
      </View>
      {subtitle ? (
        <Text variant="footnote" color="secondary" align="center" numberOfLines={1} style={styles.compactSubtitle}>
          {subtitle}
        </Text>
      ) : null}
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
    paddingBottom: spacing[4],
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  compactRow: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 32, alignItems: "center", justifyContent: "center" },
  right: { minWidth: 36, alignItems: "flex-end", justifyContent: "center" },
  largeTitles: { marginTop: spacing[4], paddingHorizontal: spacing[4] },
  largeTitlesWithoutControls: { marginTop: 0 },
  compactTitle: { position: "absolute", top: 0, bottom: 0, left: 48, right: 48, alignItems: "center", justifyContent: "center" },
  compactSubtitle: { marginTop: spacing[2], paddingHorizontal: 48 },
});
