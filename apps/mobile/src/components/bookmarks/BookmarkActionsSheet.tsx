import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Button } from "../ui/Button";
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
  onToggleRead: (bookmark: BookmarkDto) => void;
  onMove: (bookmark: BookmarkDto) => void;
  onDelete: (bookmark: BookmarkDto) => void;
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
      <Text variant="body" style={[styles.rowLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
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
  const { palette } = useTheme();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (visible) setConfirmingDelete(false);
  }, [visible, bookmark]);

  if (!bookmark) return null;

  return (
    <FloatingPanel visible={visible} onDismiss={onDismiss}>
      {confirmingDelete ? (
        <>
          <View style={[styles.dangerIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="trash-outline" size={24} color={palette.danger} />
          </View>
          <Text variant="title3" align="center">Delete bookmark?</Text>
          <Text variant="body" color="secondary" align="center" numberOfLines={3} style={styles.confirmCopy}>
            {bookmark.title || bookmark.url} will be permanently removed.
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
            <Button label="Cancel" variant="ghost" block onPress={() => setConfirmingDelete(false)} />
          </View>
        </>
      ) : (
        <>
          <Text variant="title3" numberOfLines={2} style={styles.title}>{bookmark.title || bookmark.url}</Text>
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
              Linking.openURL(bookmark.url)
                .then(() => {
                  if (!bookmark.isRead) onToggleRead(bookmark);
                })
                .catch(() => toast.error("Couldn't open the link."));
              onDismiss();
            }}
          />
          <ActionRow icon="trash-outline" label="Delete" tone="danger" onPress={() => setConfirmingDelete(true)} />
        </>
      )}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing[12] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], minHeight: 50, paddingHorizontal: spacing[4], borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { flex: 1 },
  dangerIcon: { width: 48, height: 48, borderRadius: 16, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: spacing[12] },
  confirmCopy: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[20] },
});
