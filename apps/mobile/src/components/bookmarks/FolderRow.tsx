/**
 * Folder list row with bookmark/unread counts and a lock indicator.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { spacing } from "../../theme/tokens";
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
      style={[styles.wrap, { backgroundColor: palette.surface, borderColor: palette.border }]}
      onPress={() => {
        haptics.light();
        onPress(folder);
      }}
      onLongPress={() => onLongPress?.(folder)}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name={folder.protected ? "lock-closed" : "folder-outline"} size={20} color={palette.accent} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>{folder.name}</Text>
        <Text variant="footnote" color="secondary">
          {folder.bookmarkCount} {folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}
        </Text>
      </View>
      {unread ? <Badge tone="accent">{folder.unreadCount}</Badge> : null}
      <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
});
