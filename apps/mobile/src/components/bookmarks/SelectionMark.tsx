import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

export function SelectionMark({ selected }: { selected: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.mark,
        selected
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: palette.surface, borderColor: palette.borderStrong },
      ]}
    >
      {selected ? <Ionicons name="checkmark" size={14} color={palette.onAccent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
