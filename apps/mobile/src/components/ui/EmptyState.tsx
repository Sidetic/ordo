/**
 * Friendly empty state with an icon + call to action.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name={icon} size={28} color={palette.textTertiary} />
      </View>
      <Text variant="title3" style={{ marginTop: spacing[16] }}>{title}</Text>
      {message ? (
        <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[6] }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing[20] }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing[48], paddingHorizontal: spacing[32] },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
