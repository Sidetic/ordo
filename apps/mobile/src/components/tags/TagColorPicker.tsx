/** Grid of curated tag colors (semantic keys from @ordo/shared). */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { TAG_COLORS, type TagColor } from "@ordo/shared";
import { haptics } from "../../lib/haptics";
import { tagColorValue } from "../../lib/tag-colors";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export function TagColorPicker({
  value,
  onChange,
}: {
  value: TagColor;
  onChange: (color: TagColor) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.grid}>
      {TAG_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={color}
            accessibilityState={{ selected }}
            onPress={() => {
              haptics.selection();
              onChange(color);
            }}
            style={({ pressed }) => [
              styles.swatch,
              {
                borderColor: selected ? tagColorValue(color).dot : palette.border,
                backgroundColor: selected ? tagColorValue(color).fill : palette.surfaceSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: tagColorValue(color).dot,
                  borderColor: selected ? "#FFFFFF" : "transparent",
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[10] },
  swatch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
