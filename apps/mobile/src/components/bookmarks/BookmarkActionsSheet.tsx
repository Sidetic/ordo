import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Button } from "../ui/Button";
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
  onEditTags?: (bookmark: BookmarkDto) => void;
}

export function BookmarkActionsSheet({
  visible,
  onDismiss,
  bookmark,
  onToggleRead,
  onMove,
  onDelete,
  onEditTags,
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
          <PanelHeader
            icon="trash-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Delete this bookmark?"
            subtitle="This bookmark will be permanently deleted."
            subtitleVariant="body"
          />
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
          <PanelHeader title={bookmark.title || bookmark.url} numberOfLines={2} style={styles.title} />
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
          {onEditTags ? (
            <SheetActionRow
              icon="pricetags-outline"
              label="Edit tags"
              onPress={() => {
                onEditTags(bookmark);
                onDismiss();
              }}
            />
          ) : null}
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
  actions: { gap: spacing[8], marginTop: spacing[20] },
});
