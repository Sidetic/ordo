/**
 * Folder list row with custom icon, counts, pin, and lock indicators.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { SelectionMark } from "./SelectionMark";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { radius, spacing } from "../../theme/tokens";
import { SELECTION_LONG_PRESS_MS } from "../../hooks/use-selection";
import { DEFAULT_FOLDER_ICON, type FolderDto } from "@ordo/shared";

export interface FolderRowProps {
  folder: FolderDto;
  onPress: (f: FolderDto) => void;
  onMore?: (f: FolderDto) => void;
  onLongPress?: (f: FolderDto) => void;
  selected?: boolean;
  selectionMode?: boolean;
}

export function FolderRow({ folder, onPress, onMore, onLongPress, selected, selectionMode }: FolderRowProps) {
  const { palette } = useTheme();
  const unread = folder.unreadCount > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: selected && selectionMode ? palette.accentSoft : palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <PressableScale
        accessibilityRole={selectionMode ? "checkbox" : "button"}
        accessibilityLabel={`${folder.name}, ${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}${folder.pinned ? ", pinned" : ""}${folder.protected ? ", locked" : ""}`}
        accessibilityState={selectionMode ? { checked: !!selected } : undefined}
        accessibilityHint={
          selectionMode ? (selected ? "Deselect this folder" : "Select this folder") : undefined
        }
        style={styles.rowButton}
        onPress={() => {
          if (!selectionMode) haptics.light();
          onPress(folder);
        }}
        onLongPress={onLongPress ? () => onLongPress(folder) : onMore ? () => onMore(folder) : undefined}
        delayLongPress={SELECTION_LONG_PRESS_MS}
      >
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
          {selectionMode ? (
            <SelectionMark selected={!!selected} />
          ) : (
            <Ionicons name={folder.icon ?? DEFAULT_FOLDER_ICON} size={18} color={palette.accent} />
          )}
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
      </PressableScale>
      {onMore && !selectionMode ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${folder.name}`}
          style={styles.moreBtn}
          scaleTo={0.85}
          onPress={() => onMore(folder)}
          hitSlop={12}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.textTertiary} />
        </PressableScale>
      ) : null}
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
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  iconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  moreBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
