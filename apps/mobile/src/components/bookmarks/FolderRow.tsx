/**
 * Folder list row with custom icon, counts, pin, and lock indicators.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { radius, spacing } from "../../theme/tokens";
import type { FolderDto } from "@ordo/shared";

export interface FolderRowProps {
  folder: FolderDto;
  onPress: (f: FolderDto) => void;
  onLongPress?: (f: FolderDto) => void;
}

export function FolderRow({ folder, onPress, onLongPress }: FolderRowProps) {
  const { palette } = useTheme();
  const unread = folder.unreadCount > 0;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${folder.name}, ${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}${folder.pinned ? ", pinned" : ""}${folder.protected ? ", locked" : ""}`}
      style={[styles.wrap, { backgroundColor: palette.surface, borderColor: palette.border }]}
      onPress={() => {
        haptics.light();
        onPress(folder);
      }}
      onLongPress={() => onLongPress?.(folder)}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name={folder.icon} size={18} color={palette.accent} />
      </View>
      <View style={styles.body}>
        <Text variant="title3" numberOfLines={1}>{folder.name}</Text>
        <Text variant="monoSmall" color="tertiary">
          {folder.bookmarkCount} {folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}
        </Text>
      </View>
      {folder.protected ? <Ionicons name="lock-closed" size={14} color={palette.textTertiary} /> : null}
      {folder.pinned ? <Ionicons name="pin" size={15} color={palette.accent} /> : null}
      {unread ? <Badge tone="accent">{folder.unreadCount}</Badge> : null}
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  iconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
});
