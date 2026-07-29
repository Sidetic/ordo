/**
 * Small pill badge (counts, tags, status).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const { palette } = useTheme();
  const { bg, fg } = {
    neutral: { bg: palette.surfaceSecondary, fg: palette.textSecondary },
    accent: { bg: palette.accentSoft, fg: palette.accent },
    danger: { bg: palette.dangerSoft, fg: palette.danger },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.full }]}>
      <Text variant="caption" color="primary" style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing[8], paddingVertical: spacing[4], minWidth: 20, alignItems: "center" },
});
