/**
 * Settings index — full implementation in the Settings module.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "../../../src/components/ui/Text";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function SettingsScreen() {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" }}>
      <Text variant="title2">Settings</Text>
    </View>
  );
}
