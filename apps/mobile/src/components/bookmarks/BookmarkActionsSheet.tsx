/**
 * Per-bookmark action sheet: read toggle, move, open original, delete.
 */
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import type { BookmarkDto } from "@ordo/shared";

export interface BookmarkActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  bookmark: BookmarkDto | null;
  folderId: string;
  onToggleRead: (b: BookmarkDto) => void;
  onMove: (b: BookmarkDto) => void;
  onDelete: (b: BookmarkDto) => void;
}

function ActionRow({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const color = tone === "danger" ? palette.danger : palette.text;
  return (
    <PressableScale
      style={[styles.row, { borderBottomColor: palette.border }]}
      onPress={() => {
        haptics.light();
        onPress();
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="body" style={{ color }}>{label}</Text>
    </PressableScale>
  );
}

export function BookmarkActionsSheet({
  visible,
  onDismiss,
  bookmark,
  onToggleRead,
  onMove,
  onDelete,
}: BookmarkActionsSheetProps) {
  if (!bookmark) {
    return (
      <Sheet visible={visible} onDismiss={onDismiss}>
        <View />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onDismiss={onDismiss}>
      <Text variant="title3" numberOfLines={2} style={{ marginBottom: spacing[12] }}>
        {bookmark.title || bookmark.url}
      </Text>
      <View>
        <ActionRow
          icon={bookmark.isRead ? "radio-button-off" : "checkmark-circle"}
          label={bookmark.isRead ? "Mark as unread" : "Mark as read"}
          onPress={() => {
            onToggleRead(bookmark);
            onDismiss();
          }}
        />
        <ActionRow
          icon="folder-open-outline"
          label="Move to folder"
          onPress={() => {
            onMove(bookmark);
            onDismiss();
          }}
        />
        <ActionRow
          icon="open-outline"
          label="Open original"
          onPress={() => {
            Linking.openURL(bookmark.url).catch(() => toast.error("Couldn't open the link."));
            onDismiss();
          }}
        />
        <ActionRow
          icon="trash-outline"
          label="Delete"
          tone="danger"
          onPress={() => {
            onDelete(bookmark);
            onDismiss();
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[14],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
