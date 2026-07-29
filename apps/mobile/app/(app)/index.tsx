/**
 * Home / Folders list — full implementation in the Bookmarks module.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "../../src/components/ui/Text";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function FoldersScreen() {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" }}>
      <Text variant="title2">Folders</Text>
    </View>
  );
}
