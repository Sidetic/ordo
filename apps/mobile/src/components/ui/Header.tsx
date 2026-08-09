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
import { spacing } from "../../theme/tokens";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}

export function Header({ title, subtitle, showBack, onBack, right, large }: HeaderProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    haptics.light();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  if (large) {
    return (
      <View
        style={[
          styles.largeWrap,
          { paddingTop: insets.top + spacing[4], borderBottomColor: palette.border },
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
    <View style={[styles.compactWrap, { paddingTop: insets.top + spacing[8], borderBottomColor: palette.border }]}>
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
  largeWrap: { paddingHorizontal: spacing[12], paddingBottom: spacing[6] },
  compactWrap: { paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  compactRow: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 32, alignItems: "center", justifyContent: "center" },
  right: { minWidth: 36, alignItems: "flex-end", justifyContent: "center" },
  largeTitles: { marginTop: spacing[4], paddingHorizontal: spacing[4] },
  largeTitlesWithoutControls: { marginTop: 0 },
  compactTitle: { position: "absolute", top: 0, bottom: 0, left: 48, right: 48, alignItems: "center", justifyContent: "center" },
  compactSubtitle: { marginTop: spacing[2], paddingHorizontal: 48 },
});
