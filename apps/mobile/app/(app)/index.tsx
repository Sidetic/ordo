/** Bookmarks home: unfiled bookmarks first, with folders available above them. */
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/ui/Header";
import { FAB, FABLayer } from "../../src/components/ui/FAB";
import { FloatingPanel } from "../../src/components/ui/FloatingPanel";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { ScreenContent } from "../../src/components/ui/ScreenContent";
import { SettingsSectionLabel } from "../../src/components/settings/SettingsPage";
import { BookmarkListSkeleton } from "../../src/components/ui/BookmarkListSkeleton";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { AddBookmarkSheet } from "../../src/components/bookmarks/AddBookmarkSheet";
import { BookmarkActionsSheet } from "../../src/components/bookmarks/BookmarkActionsSheet";
import { FolderRow } from "../../src/components/bookmarks/FolderRow";
import { FolderActionsSheet } from "../../src/components/bookmarks/FolderActionsSheet";
import { CreateFolderPanel } from "../../src/components/bookmarks/CreateFolderPanel";
import { MoveSheet } from "../../src/components/bookmarks/MoveSheet";
import { BookmarkRow } from "../../src/components/bookmarks/BookmarkRow";
import { useFolders } from "../../src/hooks/use-folders";
import {
  useDeleteBookmark,
  useInfiniteBookmarks,
  useMarkAllRead,
  useToggleRead,
} from "../../src/hooks/use-bookmarks";
import { useFloatingDockMetrics } from "../../src/hooks/use-floating-dock-metrics";
import { useTheme } from "../../src/theme/ThemeProvider";
import { haptics } from "../../src/lib/haptics";
import { toast } from "../../src/components/ui/toast-store";
import { errorMessage } from "../../src/lib/error-message";
import { flattenPages } from "../../src/lib/api/query-keys";
import { layout, spacing } from "../../src/theme/tokens";
import { type BookmarkDto, type FolderDto } from "@ordo/shared";

export default function BookmarksScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { visible: floatingNavigation, clearance: bottomClearance } = useFloatingDockMetrics();
  const folders = useFolders();
  const bookmarks = useInfiniteBookmarks(null);
  const toggleRead = useToggleRead(null);
  const deleteBookmark = useDeleteBookmark(null);
  const markAllRead = useMarkAllRead(null);

  const [addOpen, setAddOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [actionsFolder, setActionsFolder] = useState<FolderDto | null>(null);
  const [actionBookmark, setActionBookmark] = useState<BookmarkDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<BookmarkDto | null>(null);

  const items = useMemo(() => flattenPages(bookmarks.data?.pages ?? []), [bookmarks.data]);
  const hasUnread = items.some((bookmark) => !bookmark.isRead);

  const onToggleRead = (bookmark: BookmarkDto) => {
    haptics.light();
    toggleRead.mutate({ id: bookmark.id, isRead: !bookmark.isRead });
  };

  const onDelete = (bookmark: BookmarkDto) => {
    haptics.medium();
    deleteBookmark.mutate(bookmark.id, {
      onSuccess: () => toast.success("Bookmark deleted"),
      onError: (cause) => toast.error(errorMessage(cause)),
    });
  };

  const onMarkAllRead = () => {
    haptics.medium();
    markAllRead.mutate(undefined, {
      onSuccess: ({ updated }) => toast.success(`${updated} marked as read`),
      onError: (cause) => toast.error(errorMessage(cause)),
    });
  };

  const refresh = async () => {
    await Promise.all([bookmarks.refetch(), folders.refetch()]);
  };

  const loadMore = () => {
    if (bookmarks.hasNextPage && !bookmarks.isFetchingNextPage) {
      void bookmarks.fetchNextPage();
    }
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.sectionHeading}>
        <SettingsSectionLabel compact>Folders</SettingsSectionLabel>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="New folder"
          style={[styles.addFolderButton, { backgroundColor: palette.accentSoft }]}
          hitSlop={8}
          onPress={() => setCreateOpen(true)}
        >
          <Ionicons name="add" size={18} color={palette.accent} />
        </PressableScale>
      </View>
      {folders.isLoading ? (
        <Skeleton height={68} radiusKey="lg" />
      ) : folders.data?.length ? (
        <View style={styles.folderList}>
          {folders.data.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <FolderRow
                folder={folder}
                onPress={(selected) => router.push(`/folder/${selected.id}`)}
                onMore={setActionsFolder}
              />
              {index < folders.data.length - 1 ? <View style={styles.folderSeparator} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <PressableScale
          style={[styles.noFolders, { borderColor: palette.border, backgroundColor: palette.surface }]}
          onPress={() => setCreateOpen(true)}
        >
          <Ionicons name="folder-open-outline" size={20} color={palette.accent} />
          <View style={styles.noFoldersCopy}>
            <Text variant="bodyStrong">Organize with folders</Text>
            <Text variant="footnote" color="tertiary">Create one whenever you need it.</Text>
          </View>
          <Ionicons name="add" size={20} color={palette.textTertiary} />
        </PressableScale>
      )}
      <Text variant="caption" color="secondary" style={styles.bookmarksLabel}>BOOKMARKS</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header
        title="Bookmarks"
        large
        maxWidth={layout.maxContentWidth}
        right={
          hasUnread ? (
            <PressableScale style={styles.headerAction} onPress={onMarkAllRead} hitSlop={8}>
              <Ionicons name="checkmark-done" size={22} color={palette.accent} />
            </PressableScale>
          ) : undefined
        }
      />

      {bookmarks.error && !bookmarks.data ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.center}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load bookmarks"
            message={errorMessage(bookmarks.error)}
            action={<Button label="Retry" onPress={refresh} />}
          />
        </ScreenContent>
      ) : (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.content}>
          <FlashList
            data={items}
            keyExtractor={(bookmark: BookmarkDto) => bookmark.id}
            renderItem={({ item }: { item: BookmarkDto }) => (
              <BookmarkRow
                bookmark={item}
                onPress={(bookmark) => router.push(`/reader/${bookmark.id}`)}
                onMore={setActionBookmark}
              />
            )}
            estimatedItemSize={108}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              bookmarks.isLoading ? (
                <BookmarkListSkeleton />
              ) : (
                <View style={styles.emptyBookmarks}>
                  <EmptyState
                    icon="bookmark-outline"
                    title="No bookmarks yet"
                    message="Save a link now, then organize it into a folder whenever you want."
                    action={<Button label="Save bookmark" onPress={() => setAddOpen(true)} />}
                  />
                </View>
              )
            }
            ListFooterComponent={
              bookmarks.isFetchingNextPage ? (
                <View style={styles.footer}><ActivityIndicator color={palette.accent} /></View>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: floatingNavigation ? bottomClearance : spacing[96] }}
            refreshing={(bookmarks.isFetching || folders.isFetching) && !bookmarks.isLoading}
            onRefresh={refresh}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
          />
        </ScreenContent>
      )}

      <FABLayer maxWidth={layout.maxContentWidth}>
        <FAB
          onPress={() => setCreateMenuOpen(true)}
          testID="add-bookmark-fab"
          bottom={floatingNavigation ? bottomClearance : spacing[20]}
          right={spacing[20]}
        />
      </FABLayer>

      <FloatingPanel visible={createMenuOpen} onDismiss={() => setCreateMenuOpen(false)}>
        <Text variant="title3" style={styles.createMenuTitle}>Create</Text>
        <View style={styles.createMenuActions}>
          <PressableScale
            accessibilityRole="button"
            style={[styles.createMenuAction, { backgroundColor: palette.surfaceSecondary }]}
            onPress={() => {
              setCreateMenuOpen(false);
              setTimeout(() => setAddOpen(true), 100);
            }}
          >
            <Ionicons name="bookmark-outline" size={20} color={palette.accent} />
            <View style={styles.createMenuCopy}>
              <Text variant="bodyStrong">Save bookmark</Text>
              <Text variant="footnote" color="tertiary">Add a link to your library</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            style={[styles.createMenuAction, { backgroundColor: palette.surfaceSecondary }]}
            onPress={() => {
              setCreateMenuOpen(false);
              setTimeout(() => setCreateOpen(true), 100);
            }}
          >
            <Ionicons name="folder-outline" size={20} color={palette.accent} />
            <View style={styles.createMenuCopy}>
              <Text variant="bodyStrong">New folder</Text>
              <Text variant="footnote" color="tertiary">Organize bookmarks into a folder</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
          </PressableScale>
        </View>
      </FloatingPanel>

      <AddBookmarkSheet
        visible={addOpen}
        onDismiss={() => setAddOpen(false)}
        folderId={null}
        allowFolderSelection
      />

      <BookmarkActionsSheet
        visible={!!actionBookmark}
        bookmark={actionBookmark}
        onDismiss={() => setActionBookmark(null)}
        onToggleRead={onToggleRead}
        onMove={setMoveTarget}
        onDelete={onDelete}
      />

      <MoveSheet
        visible={!!moveTarget}
        bookmark={moveTarget}
        fromFolderId={null}
        onDismiss={() => setMoveTarget(null)}
      />

      <CreateFolderPanel visible={createOpen} onDismiss={() => setCreateOpen(false)} />

      <FolderActionsSheet
        visible={!!actionsFolder}
        folder={actionsFolder}
        onDismiss={() => setActionsFolder(null)}
        onDeleted={() => {
          toast.success("Folder deleted");
          setActionsFolder(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: "100%" },
  center: { flex: 1, width: "100%", justifyContent: "center" },
  headerAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  listHeader: { paddingTop: spacing[8] },
  sectionHeading: {
    position: "relative",
  },
  addFolderButton: {
    position: "absolute",
    top: -spacing[6],
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  folderList: { paddingBottom: spacing[4] },
  folderSeparator: { height: spacing[8] },
  noFolders: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing[16],
  },
  noFoldersCopy: { flex: 1 },
  bookmarksLabel: { paddingTop: spacing[16], paddingBottom: spacing[8] },
  emptyBookmarks: { minHeight: 300, justifyContent: "center" },
  footer: { paddingVertical: spacing[20], alignItems: "center" },
  createMenuTitle: { marginBottom: spacing[16] },
  createMenuActions: { gap: spacing[8] },
  createMenuAction: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: 12,
  },
  createMenuCopy: { flex: 1 },
});
