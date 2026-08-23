/**
 * Folder detail: cursor-paginated bookmark list with infinite scroll.
 * Handles protected folders (unlock prompt → token cached → retry),
 * optimistic toggle/delete/move, mark-all-read, and folder actions.
 */
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../../src/components/ui/Header";
import { FAB, FABLayer } from "../../../src/components/ui/FAB";
import { Button } from "../../../src/components/ui/Button";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { ScreenContent } from "../../../src/components/ui/ScreenContent";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { BookmarkListSkeleton } from "../../../src/components/ui/BookmarkListSkeleton";
import { BookmarkRow } from "../../../src/components/bookmarks/BookmarkRow";
import { AddBookmarkSheet } from "../../../src/components/bookmarks/AddBookmarkSheet";
import { MoveSheet } from "../../../src/components/bookmarks/MoveSheet";
import { LockPrompt } from "../../../src/components/bookmarks/LockPrompt";
import { BookmarkActionsSheet } from "../../../src/components/bookmarks/BookmarkActionsSheet";
import { FolderActionsSheet } from "../../../src/components/bookmarks/FolderActionsSheet";
import { ReaderPane, ReaderPanePlaceholder } from "../../../src/components/reader/ReaderPane";
import { useFolders } from "../../../src/hooks/queries";
import {
  useInfiniteBookmarks,
  useToggleRead,
  useDeleteBookmark,
  useMarkAllRead,
} from "../../../src/hooks/use-bookmarks";
import { useResponsiveLayout } from "../../../src/hooks/use-responsive-layout";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { errorMessage, isFolderProtected } from "../../../src/lib/error-message";
import { flattenPages } from "../../../src/lib/api/query-keys";
import { layout, radius, spacing } from "../../../src/theme/tokens";
import type { BookmarkDto } from "@ordo/shared";

export default function FolderDetailScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { hasDetailPane } = useResponsiveLayout();
  const { id, bookmark } = useLocalSearchParams<{ id: string; bookmark?: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const selectedBookmarkId = Array.isArray(bookmark) ? bookmark[0] : bookmark;
  /** "root" (or a missing param) maps to the unfiled list; otherwise a real folder id. */
  const isRoot = routeId === "root";
  const folderId = isRoot || !routeId ? null : routeId;

  const { data: folders } = useFolders();
  const folder = useMemo(() => folders?.find((f) => f.id === folderId), [folders, folderId]);

  const bookmarks = useInfiniteBookmarks(folderId, !!routeId);
  const toggleRead = useToggleRead(folderId);
  const deleteBm = useDeleteBookmark(folderId);
  const markAll = useMarkAllRead(folderId);

  const [addOpen, setAddOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<BookmarkDto | null>(null);
  const [actionBm, setActionBm] = useState<BookmarkDto | null>(null);
  const [folderActions, setFolderActions] = useState(false);

  const protectedError = !!bookmarks.error && isFolderProtected(bookmarks.error);
  const items = useMemo(() => flattenPages(bookmarks.data?.pages ?? []), [bookmarks.data]);
  const isEmpty = !bookmarks.isLoading && !protectedError && items.length === 0;
  // Root isn't a folder row, so derive unread state from the loaded items.
  const hasUnread = folder ? folder.unreadCount > 0 : items.some((b) => !b.isRead);

  const openReader = (b: BookmarkDto) => {
    if (hasDetailPane) {
      router.push({
        pathname: "/folder/[id]",
        params: { id: folderId ?? "root", bookmark: b.id },
      });
      return;
    }
    router.push(`/reader/${b.id}`);
  };

  const loadMore = () => {
    if (bookmarks.hasNextPage && !bookmarks.isFetchingNextPage) {
      bookmarks.fetchNextPage();
    }
  };

  const onToggleRead = (b: BookmarkDto) => {
    haptics.light();
    toggleRead.mutate({ id: b.id, isRead: !b.isRead });
  };

  const onDelete = (b: BookmarkDto) => {
    haptics.medium();
    deleteBm.mutate(b.id, {
      onSuccess: () => {
        toast.success("Bookmark deleted");
        if (selectedBookmarkId === b.id) {
          router.replace({ pathname: "/folder/[id]", params: { id: folderId ?? "root" } });
        }
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const onMarkAllRead = () => {
    haptics.medium();
    markAll.mutate(undefined, {
      onSuccess: (r) => toast.success(`${r.updated} marked as read`),
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const listContentPadding = spacing[96];
  const listPane = (
    <FlashList
      data={items}
      keyExtractor={(b: BookmarkDto) => b.id}
      renderItem={({ item }: { item: BookmarkDto }) => (
        <BookmarkRow
          bookmark={item}
          onPress={openReader}
          onMore={(b) => setActionBm(b)}
          selected={hasDetailPane && item.id === selectedBookmarkId}
        />
      )}
      estimatedItemSize={108}
      contentContainerStyle={{ paddingBottom: listContentPadding }}
      refreshing={bookmarks.isFetching && !bookmarks.isFetchingNextPage}
      onRefresh={() => bookmarks.refetch()}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        bookmarks.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header
        title={folder?.name ?? (isRoot ? "Bookmarks" : "Folder")}
        subtitle={folder ? `${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}` : undefined}
        showBack
        right={
          hasUnread && !protectedError ? (
            <PressableScale style={styles.iconBtn} scaleTo={0.85} onPress={onMarkAllRead} hitSlop={8}>
              <Ionicons name="checkmark-done" size={22} color={palette.accent} />
            </PressableScale>
          ) : folder ? (
            <PressableScale style={styles.iconBtn} scaleTo={0.85} onPress={() => setFolderActions(true)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={22} color={palette.text} />
            </PressableScale>
          ) : undefined
        }
      />

      {protectedError ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.center}>
          <EmptyState
            icon="lock-closed-outline"
            title="This folder is locked"
            message="Enter the password to view these bookmarks."
          />
          <LockPrompt
            visible={protectedError && !!folderId}
            folderId={folderId ?? ""}
            folderName={folder?.name}
            onDismiss={() => router.back()}
            onUnlocked={() => bookmarks.refetch()}
          />
        </ScreenContent>
      ) : isEmpty ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.center}>
          <EmptyState
            icon="bookmark-outline"
            title="No bookmarks here"
            message="Save a link to start reading."
            action={<Button onPress={() => setAddOpen(true)} label="Save bookmark" />}
          />
        </ScreenContent>
      ) : bookmarks.isLoading ? (
        <ScreenContent
          maxWidth={hasDetailPane ? layout.maxLibraryWidth : layout.maxContentWidth}
          style={styles.content}
        >
          {hasDetailPane ? (
            <View style={styles.splitPane}>
              <View style={styles.listPane}>
                <BookmarkListSkeleton />
              </View>
              <View style={[styles.readerPane, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <ReaderPanePlaceholder />
              </View>
            </View>
          ) : (
            <View style={styles.singlePane}>
              <BookmarkListSkeleton />
            </View>
          )}
        </ScreenContent>
      ) : hasDetailPane ? (
        <ScreenContent maxWidth={layout.maxLibraryWidth} style={styles.content}>
          <View style={styles.splitPane}>
            <View style={styles.listPane}>
              {listPane}
              <FAB
                onPress={() => setAddOpen(true)}
                testID="add-bookmark-fab"
                right={spacing[20]}
              />
            </View>
            <View style={[styles.readerPane, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {selectedBookmarkId ? (
                <ReaderPane bookmarkId={selectedBookmarkId} embedded safeBottom={false} />
              ) : (
                <ReaderPanePlaceholder />
              )}
            </View>
          </View>
        </ScreenContent>
      ) : (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.content}>
          <View style={styles.singlePane}>{listPane}</View>
        </ScreenContent>
      )}

      {!protectedError && !hasDetailPane ? (
        <FABLayer maxWidth={layout.maxContentWidth}>
          <FAB
            onPress={() => setAddOpen(true)}
            testID="add-bookmark-fab"
            right={spacing[20]}
          />
        </FABLayer>
      ) : null}

      <AddBookmarkSheet
        visible={addOpen}
        onDismiss={() => setAddOpen(false)}
        folderId={folderId}
        folderName={folder?.name ?? null}
      />

      <BookmarkActionsSheet
        visible={!!actionBm}
        bookmark={actionBm}
        onDismiss={() => setActionBm(null)}
        onToggleRead={onToggleRead}
        onMove={(b) => setMoveTarget(b)}
        onDelete={onDelete}
      />

      <MoveSheet
        visible={!!moveTarget}
        bookmark={moveTarget}
        fromFolderId={folderId}
        onDismiss={() => setMoveTarget(null)}
      />

      <FolderActionsSheet
        visible={folderActions}
        folder={folder ?? null}
        onDismiss={() => setFolderActions(false)}
        onDeleted={() => {
          toast.success("Folder deleted");
          setFolderActions(false);
          router.replace("/");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, width: "100%" },
  center: { flex: 1, width: "100%", justifyContent: "center" },
  singlePane: { flex: 1, width: "100%" },
  splitPane: { flex: 1, width: "100%", flexDirection: "row", gap: spacing[16], paddingBottom: spacing[8] },
  listPane: { width: 380, flexShrink: 0 },
  readerPane: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  footer: { paddingVertical: spacing[20], alignItems: "center" },
});
