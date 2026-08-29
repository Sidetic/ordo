/**
 * Floating dialog to move a bookmark into another folder.
 */
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "../ui/FloatingPanel";
import { LockPrompt } from "./LockPrompt";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useFolders } from "../../hooks/queries";
import { useMoveBookmark } from "../../hooks/use-bookmarks";
import { errorMessage, isFolderProtected } from "../../lib/error-message";
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
  /** Folder the list is currently scoped to, or null for unfiled root. */
  fromFolderId: string | null;
}

/** Sentinel row representing the unfiled root ("Bookmarks"). */
const ROOT_DESTINATION = Symbol("root");
type Destination = FolderDto | typeof ROOT_DESTINATION;

function isRootDestination(d: Destination): d is typeof ROOT_DESTINATION {
  return d === ROOT_DESTINATION;
}

export function MoveSheet({ visible, onDismiss, bookmark, fromFolderId }: MoveSheetProps) {
  const { palette } = useTheme();
  const { data: folders } = useFolders();
  const move = useMoveBookmark(fromFolderId);
  const { height } = useResponsiveLayout();
  const [error, setError] = useState("");
  const [lockedTarget, setLockedTarget] = useState<FolderDto | null>(null);

  useEffect(() => {
    if (visible) {
      setError("");
      setLockedTarget(null);
    }
  }, [visible]);

  // Offer the unfiled root as a destination only when currently inside a folder.
  const destinations: Destination[] = (folders ?? []).filter((f) => f.id !== fromFolderId);
  if (fromFolderId !== null) destinations.unshift(ROOT_DESTINATION);

  const pick = async (destination: Destination) => {
    if (!bookmark) return;
    const toFolderId = isRootDestination(destination) ? null : destination.id;
    const name = isRootDestination(destination) ? "Bookmarks" : destination.name;
    setError("");
    haptics.light();
    try {
      await move.mutateAsync({ id: bookmark.id, toFolderId });
      toast.success(`Moved to ${name}`);
      onDismiss();
    } catch (e) {
      if (!isRootDestination(destination) && isFolderProtected(e)) {
        setLockedTarget(destination);
        return;
      }
      setError(errorMessage(e));
    }
  };

  return (
    <>
      <FloatingPanel visible={visible && !lockedTarget} onDismiss={onDismiss}>
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
          keyExtractor={(d) => (isRootDestination(d) ? "root" : d.id)}
          renderItem={({ item }) => (
            <PressableScale style={[styles.row, { borderBottomColor: palette.border }]} onPress={() => pick(item)} accessibilityRole="button" accessibilityLabel={isRootDestination(item) ? "Bookmarks" : item.name}>
              <Ionicons
                name={isRootDestination(item) ? "bookmark-outline" : (item.icon ?? DEFAULT_FOLDER_ICON)}
                size={20}
                color={palette.accent}
              />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {isRootDestination(item) ? "Bookmarks" : item.name}
              </Text>
              {isRootDestination(item) ? null : (
                <>
                  {item.pinned ? <Ionicons name="pin" size={14} color={palette.accent} /> : null}
                  {item.protected ? <Ionicons name="lock-closed" size={14} color={palette.textTertiary} /> : null}
                  <Text variant="footnote" color="tertiary">{item.bookmarkCount}</Text>
                </>
              )}
            </PressableScale>
          )}
          style={{ maxHeight: Math.min(320, height * 0.5) }}
        />
      )}
      </FloatingPanel>
      <LockPrompt
        visible={visible && !!lockedTarget}
        folderId={lockedTarget?.id ?? ""}
        folderName={lockedTarget?.name}
        onDismiss={() => setLockedTarget(null)}
        onUnlocked={() => {
          const target = lockedTarget;
          setLockedTarget(null);
          if (target) void pick(target);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], paddingVertical: spacing[14], borderBottomWidth: StyleSheet.hairlineWidth },
});
