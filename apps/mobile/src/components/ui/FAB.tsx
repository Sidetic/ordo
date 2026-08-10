/**
 * Floating action button faithful to ordo-archive: 48px coral circle, white icon.
 */
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/tokens";

export interface FABProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  bottom?: number;
  maxContentWidth?: number;
}

export function FAB({
  icon = "add",
  onPress,
  testID,
  bottom = spacing[20],
  maxContentWidth = layout.maxLibraryWidth,
}: FABProps) {
  const { palette, shadows } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const right = Math.max(
    insets.right + spacing[20],
    (width - Math.min(width, maxContentWidth)) / 2 + spacing[20],
  );
  return (
    <PressableScale
      testID={testID}
      style={[styles.fab, { backgroundColor: palette.accent, bottom, right }, shadows.level2]}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
