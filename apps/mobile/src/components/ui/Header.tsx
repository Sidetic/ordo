/**
 * Screen header with optional back button, title, and trailing action.
 * Faithful to ordo: bg, no elevation, Inter Tight title (tight tracking),
 * compact 32×24 trailing icon buttons.
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

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing[8], borderBottomColor: palette.border }]}>
      <View style={styles.row}>
        {showBack ? (
          <PressableScale style={styles.backBtn} scaleTo={0.85} onPress={handleBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </PressableScale>
        ) : (
          <View style={styles.backBtn} />
        )}
        {right ? <View style={styles.right}>{right}</View> : <View style={styles.right} />}
      </View>
      <View style={[styles.titles, !large && styles.compact]}>
        <Text variant={large ? "title1" : "headline"} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text variant="footnote" color="secondary" numberOfLines={1} style={{ marginTop: spacing[2] }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing[12], paddingBottom: spacing[8] },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  backBtn: { width: 36, height: 32, alignItems: "center", justifyContent: "center" },
  right: { minWidth: 36, alignItems: "flex-end", justifyContent: "center" },
  titles: { marginTop: spacing[4], paddingHorizontal: spacing[4] },
  compact: { marginTop: 0 },
});
