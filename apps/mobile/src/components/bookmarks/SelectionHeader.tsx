/**
 * Compact header shown while multi-select is active: Cancel, count, Select all.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/tokens";

export function SelectionHeader({
  count,
  selectableCount,
  onCancel,
  onToggleSelectAll,
  maxWidth = layout.maxContentWidth,
}: {
  count: number;
  selectableCount: number;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  maxWidth?: number;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const allSelected = selectableCount > 0 && count === selectableCount;
  const title = count === 0 ? "Select items" : count === 1 ? "1 selected" : `${count} selected`;

  return (
    <View
      style={[
        styles.wrap,
        {
          maxWidth,
          paddingTop: insets.top + spacing[4],
          paddingLeft: Math.max(insets.left, spacing[16]),
          paddingRight: Math.max(insets.right, spacing[16]),
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={styles.row}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Cancel selection"
          onPress={onCancel}
          hitSlop={8}
          style={styles.side}
        >
          <Text variant="bodyStrong" color="accent">
            Cancel
          </Text>
        </PressableScale>
        <Text variant="title3" align="center" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {selectableCount > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
            onPress={onToggleSelectAll}
            hitSlop={8}
            style={[styles.side, styles.right]}
          >
            <Text variant="bodyStrong" color="accent" numberOfLines={1}>
              {allSelected ? "Deselect" : "Select all"}
            </Text>
          </PressableScale>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  side: { minWidth: 72, justifyContent: "center" },
  right: { alignItems: "flex-end" },
  title: { flex: 1 },
});
