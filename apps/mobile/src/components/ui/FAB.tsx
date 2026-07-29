/**
 * Floating action button with spring press feedback.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

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
      style={[styles.fab, { backgroundColor: palette.accent, borderRadius: radius.full }, shadows.level3]}
      scaleTo={0.9}
      onPress={onPress}
    >
      <Ionicons name={icon} size={26} color={palette.onAccent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", right: spacing[20], bottom: spacing[24], width: 56, height: 56, alignItems: "center", justifyContent: "center" },
});
