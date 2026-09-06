/** Friendly empty state — warm, line-driven. */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
  /** Tighter padding for inline use (e.g. under a reader article header). */
  compact?: boolean;
}

export function EmptyState({ icon, title, message, action, compact }: EmptyStateProps) {
  const { palette } = useTheme();
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={[styles.iconCircle, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
        <Ionicons name={icon} size={26} color={palette.textTertiary} />
      </View>
      <Text variant="title2" align="center" style={{ marginTop: spacing[12] }}>{title}</Text>
      {message ? (
        <Text variant="footnote" color="secondary" align="center" style={{ marginTop: spacing[4] }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing[16] }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[32],
    paddingHorizontal: spacing[24],
  },
  compact: {
    paddingVertical: spacing[20],
    paddingHorizontal: spacing[16],
  },
  iconCircle: { width: 60, height: 60, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
