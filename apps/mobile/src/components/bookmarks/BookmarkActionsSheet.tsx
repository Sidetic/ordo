import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { SheetActionRow } from "../ui/SheetActionRow";
import { toast } from "../ui/toast-store";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import type { BookmarkDto } from "@ordo/shared";

export interface BookmarkActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  bookmark: BookmarkDto | null;
  onToggleRead: (bookmark: BookmarkDto) => void;
  onMove: (bookmark: BookmarkDto) => void;
  onDelete: (bookmark: BookmarkDto) => void;
}

export function BookmarkActionsSheet({
  visible,
  onDismiss,
  bookmark,
  onToggleRead,
  onMove,
  onDelete,
}: BookmarkActionsSheetProps) {
  const { palette } = useTheme();
  const [mode, setMode] = useState<"menu" | "delete">("menu");

  useEffect(() => {
    if (visible) setMode("menu");
  }, [visible]);

  if (!bookmark) return null;

  return (
    <FloatingPanel visible={visible} onDismiss={onDismiss}>
      {mode === "delete" ? (
        <>
          <View style={[styles.dangerIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="trash-outline" size={24} color={palette.danger} />
          </View>
          <Text variant="title3" align="center">Delete this bookmark?</Text>
          <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
            This bookmark will be permanently deleted.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Delete bookmark"
              variant="danger"
              block
              size="lg"
              onPress={() => {
                onDelete(bookmark);
                onDismiss();
              }}
            />
            <Button label="Cancel" variant="ghost" block onPress={() => setMode("menu")} />
          </View>
        </>
      ) : (
        <>
          <Text variant="title3" numberOfLines={2} style={styles.title}>{bookmark.title || bookmark.url}</Text>
          <SheetActionRow
            icon={bookmark.isRead ? "radio-button-off" : "checkmark-circle"}
            label={bookmark.isRead ? "Mark as unread" : "Mark as read"}
            onPress={() => {
              onToggleRead(bookmark);
              onDismiss();
            }}
          />
          <SheetActionRow
            icon="folder-open-outline"
            label="Move to folder"
            onPress={() => {
              onMove(bookmark);
              onDismiss();
            }}
          />
          <SheetActionRow
            icon="open-outline"
            label="Open original"
            onPress={() => {
              Linking.openURL(bookmark.url)
                .then(() => {
                  if (!bookmark.isRead) onToggleRead(bookmark);
                })
                .catch(() => toast.error("Couldn't open the link."));
              onDismiss();
            }}
          />
          <SheetActionRow
            icon="trash-outline"
            label="Delete bookmark"
            tone="danger"
            onPress={() => setMode("delete")}
          />
          <Button label="Cancel" variant="ghost" block onPress={onDismiss} style={styles.menuCancel} />
        </>
      )}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing[12] },
  menuCancel: { marginTop: spacing[8] },
  dangerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[12],
  },
  confirmCopy: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[20] },
});
