import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

export function SelectionMark({ selected, size = 22 }: { selected: boolean; size?: number }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
        },
        selected
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: "transparent", borderColor: palette.borderStrong },
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark" size={Math.round(size * 0.64)} color={palette.onAccent} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
