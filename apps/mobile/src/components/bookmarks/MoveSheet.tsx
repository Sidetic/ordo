/**
 * Floating dialog to move a bookmark into another folder.
 */
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useFolders } from "../../hooks/queries";
import { useMoveBookmark } from "../../hooks/use-bookmarks";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { useResponsiveLayout } from "../../hooks/use-responsive-layout";
import { DEFAULT_FOLDER_ICON, type BookmarkDto, type FolderDto } from "@ordo/shared";

export interface MoveSheetProps {
  visible: boolean;
  onDismiss: () => void;
  bookmark: BookmarkDto | null;
  fromFolderId: string;
}

export function MoveSheet({ visible, onDismiss, bookmark, fromFolderId }: MoveSheetProps) {
  const { palette } = useTheme();
  const { data: folders } = useFolders();
  const move = useMoveBookmark(fromFolderId);
  const { height } = useResponsiveLayout();
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) setError("");
  }, [visible]);

  const destinations = (folders ?? []).filter((f) => f.id !== fromFolderId);

  const pick = async (folder: FolderDto) => {
    if (!bookmark) return;
    setError("");
    haptics.light();
    try {
      await move.mutateAsync({ id: bookmark.id, toFolderId: folder.id });
      toast.success(`Moved to ${folder.name}`);
      onDismiss();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <FloatingPanel visible={visible} onDismiss={onDismiss}>
      <Text variant="title3" style={{ marginBottom: spacing[16] }}>Move to folder</Text>
      {error ? (
        <Text variant="footnote" color="danger" style={{ marginBottom: spacing[12] }}>
          {error}
        </Text>
      ) : null}
      {destinations.length === 0 ? (
        <Text variant="body" color="secondary">No other folders available.</Text>
      ) : (
        <FlatList
          data={destinations}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <PressableScale style={[styles.row, { borderBottomColor: palette.border }]} onPress={() => pick(item)}>
              <Ionicons name={item.icon ?? DEFAULT_FOLDER_ICON} size={20} color={palette.accent} />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{item.name}</Text>
              {item.pinned ? <Ionicons name="pin" size={14} color={palette.accent} /> : null}
              {item.protected ? <Ionicons name="lock-closed" size={14} color={palette.textTertiary} /> : null}
              <Text variant="footnote" color="tertiary">{item.bookmarkCount}</Text>
            </PressableScale>
          )}
          style={{ maxHeight: Math.min(320, height * 0.5) }}
        />
      )}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], paddingVertical: spacing[14], borderBottomWidth: StyleSheet.hairlineWidth },
});
