/**
 * Bookmark list skeleton (used while the first page loads).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";
import { spacing } from "../../theme/tokens";

export function BookmarkListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="90%" height={16} style={{ marginTop: spacing[8] }} />
          <Skeleton width="70%" height={12} style={{ marginTop: spacing[8] }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
});
