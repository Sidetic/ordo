/**
 * Library destination for the tag catalogue. Sits with folders on Bookmarks
 * home so tags are one tap away without a separate chip section.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { radius, spacing } from "../../theme/tokens";

export interface TagsLibraryRowProps {
  count: number;
  onPress: () => void;
}

export function TagsLibraryRow({ count, onPress }: TagsLibraryRowProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Tags, ${count} ${count === 1 ? "tag" : "tags"}`}
        accessibilityHint="Browse and manage tags."
        style={styles.rowButton}
        onPress={() => {
          haptics.light();
          onPress();
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="pricetags-outline" size={18} color={palette.accent} />
        </View>
        <View style={styles.body}>
          <Text variant="title3" numberOfLines={1}>
            Tags
          </Text>
          <Text variant="monoSmall" color="tertiary">
            {count} {count === 1 ? "tag" : "tags"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  rowButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing[12],
    paddingRight: spacing[12],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  iconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
});
