/**
 * Sheet to move a bookmark into another folder.
 */
import React from "react";
import { FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useFolders } from "../../hooks/queries";
import { useMoveBookmark } from "../../hooks/use-bookmarks";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import type { BookmarkDto, FolderDto } from "@ordo/shared";

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

  const destinations = (folders ?? []).filter((f) => f.id !== fromFolderId);

  const pick = async (folder: FolderDto) => {
    if (!bookmark) return;
    haptics.light();
    try {
      await move.mutateAsync({ id: bookmark.id, toFolderId: folder.id });
      toast.success(`Moved to ${folder.name}`);
      onDismiss();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Sheet visible={visible} onDismiss={onDismiss}>
      <Text variant="title3" style={{ marginBottom: spacing[16] }}>Move to folder</Text>
      {destinations.length === 0 ? (
        <Text variant="body" color="secondary">No other folders available.</Text>
      ) : (
        <FlatList
          data={destinations}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <PressableScale style={[styles.row, { borderBottomColor: palette.border }]} onPress={() => pick(item)}>
              <Ionicons name={item.protected ? "lock-closed" : "folder-outline"} size={20} color={palette.accent} />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{item.name}</Text>
              <Text variant="footnote" color="tertiary">{item.bookmarkCount}</Text>
            </PressableScale>
          )}
          style={{ maxHeight: 320 }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], paddingVertical: spacing[14], borderBottomWidth: StyleSheet.hairlineWidth },
});
