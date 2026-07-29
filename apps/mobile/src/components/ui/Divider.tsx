/** Thin themed divider (1px line). */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function Divider({ style }: { style?: import("react-native").ViewStyle }) {
  const { palette } = useTheme();
  return <View style={[styles.line, { backgroundColor: palette.border }, style]} />;
}

const styles = StyleSheet.create({
  line: { height: 1, width: "100%" },
});
