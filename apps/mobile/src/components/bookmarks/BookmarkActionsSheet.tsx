import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Button } from "../ui/Button";
import { SheetActionRow } from "../ui/SheetActionRow";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { copyLink } from "../../lib/copy-link";
import { bookmarkCanBeArticle, bookmarkIsArticle } from "../../lib/bookmark-reader";
import * as bookmarkHooks from "../../hooks/use-bookmarks";
import { toast } from "../ui/toast-store";
import { errorMessage } from "../../lib/error-message";
import type { BookmarkDto } from "@ordo/shared";

function useSetContentKindMissing() {
  return { mutate: () => undefined, isPending: false };
}

const useSetContentKind =
  typeof bookmarkHooks.useSetContentKind === "function"
    ? bookmarkHooks.useSetContentKind
    : useSetContentKindMissing;

export interface BookmarkActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  bookmark: BookmarkDto | null;
  onToggleRead: (bookmark: BookmarkDto) => void;
  onMove: (bookmark: BookmarkDto) => void;
  onDelete: (bookmark: BookmarkDto) => { undo: () => void; commit: () => void } | void;
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
  const router = useRouter();
  const setContentKind = useSetContentKind();
  const [mode, setMode] = useState<"menu" | "delete" | "deleted">("menu");
  const pendingDelete = useRef<{ undo: () => void; commit: () => void } | null>(null);

  useEffect(() => {
    if (visible) {
      setMode("menu");
      return;
    }
    pendingDelete.current?.commit();
    pendingDelete.current = null;
  }, [visible]);

  if (!bookmark) return null;

  const dismiss = () => {
    pendingDelete.current?.commit();
    pendingDelete.current = null;
    onDismiss();
  };

  return (
    <FloatingPanel visible={visible} onDismiss={dismiss}>
      {mode === "delete" ? (
        <>
          <PanelHeader
            icon="trash-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Delete this bookmark?"
            subtitle="You can undo this."
          />
          <View style={styles.actions}>
            <Button
              label="Delete bookmark"
              variant="danger"
              block
              size="lg"
              onPress={() => {
                pendingDelete.current = onDelete(bookmark) ?? null;
                setMode("deleted");
              }}
            />
            <Button label="Cancel" variant="ghost" block onPress={() => setMode("menu")} />
          </View>
        </>
      ) : mode === "deleted" ? (
        <>
          <PanelHeader
            icon="trash-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Bookmark deleted"
            subtitle="You can undo this."
          />
          <View style={styles.actions}>
            <Button
              label="Undo"
              variant="primary"
              block
              size="lg"
              onPress={() => {
                pendingDelete.current?.undo();
                pendingDelete.current = null;
                setMode("menu");
              }}
            />
            <Button label="Done" variant="ghost" block onPress={dismiss} />
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
            icon="globe-outline"
            label="Open original"
            onPress={() => {
              router.push({
                pathname: "/reader/[id]",
                params: { id: bookmark.id, view: "browser" },
              });
              if (!bookmark.isRead) onToggleRead(bookmark);
              onDismiss();
            }}
          />
          {typeof bookmarkHooks.useSetContentKind === "function" && bookmarkIsArticle(bookmark) ? (
            <SheetActionRow
              icon="globe-outline"
              label="Mark as website"
              onPress={() => {
                setContentKind.mutate(
                  {
                    id: bookmark.id,
                    folderId: bookmark.folderId,
                    contentKindOverride: "web",
                  },
                  {
                    onSuccess: () => toast.success("Saved as a website"),
                    onError: (err) => toast.error(errorMessage(err, "Couldn't update this bookmark.")),
                  },
                );
                onDismiss();
              }}
            />
          ) : typeof bookmarkHooks.useSetContentKind === "function" && bookmarkCanBeArticle(bookmark) ? (
            <SheetActionRow
              icon="reader-outline"
              label="Mark as article"
              onPress={() => {
                setContentKind.mutate(
                  {
                    id: bookmark.id,
                    folderId: bookmark.folderId,
                    contentKindOverride: "article",
                  },
                  {
                    onSuccess: () => toast.success("Saved as an article"),
                    onError: (err) => toast.error(errorMessage(err, "Couldn't update this bookmark.")),
                  },
                );
                onDismiss();
              }}
            />
          ) : null}
          <SheetActionRow
            icon="link-outline"
            label="Copy link"
            onPress={() => {
              void copyLink(bookmark.url);
              onDismiss();
            }}
          />
          <SheetActionRow
            icon="trash-outline"
            label="Delete bookmark"
            tone="danger"
            onPress={() => setMode("delete")}
          />
          <Button label="Cancel" variant="ghost" block onPress={dismiss} style={styles.menuCancel} />
        </>
      )}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing[8] },
  menuCancel: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[16] },
});
