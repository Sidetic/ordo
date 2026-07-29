/**
 * Floating action button faithful to ordo-archive: 48px coral circle, white icon.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";

export interface FABProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}

export function FAB({ icon = "add", onPress, testID }: FABProps) {
  const { palette, shadows } = useTheme();
  return (
    <PressableScale
      testID={testID}
      style={[styles.fab, { backgroundColor: palette.accent }, shadows.level2]}
      scaleTo={0.9}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={palette.onAccent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing[20],
    bottom: spacing[20],
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
