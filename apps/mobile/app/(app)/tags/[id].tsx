/**
 * Tag browse: whole-library bookmark list for one tag. Other tags stay on
 * each row (except the one you are already viewing) and open that tag.
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
import { BookmarkActionsSheet } from "../../../src/components/bookmarks/BookmarkActionsSheet";
import { MoveSheet } from "../../../src/components/bookmarks/MoveSheet";
import { EditTagsSheet } from "../../../src/components/tags/EditTagsSheet";
import { ReaderPane, ReaderPanePlaceholder } from "../../../src/components/reader/ReaderPane";
import { useTags, useTaggedBookmarks } from "../../../src/hooks/use-tags";
import {
  useToggleRead,
  useDeleteBookmark,
} from "../../../src/hooks/use-bookmarks";
import { useResponsiveLayout } from "../../../src/hooks/use-responsive-layout";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { errorMessage } from "../../../src/lib/error-message";
import { flattenPages } from "../../../src/lib/api/query-keys";
import { layout, radius, spacing } from "../../../src/theme/tokens";
import type { BookmarkDto } from "@ordo/shared";

export default function TagDetailScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { hasDetailPane } = useResponsiveLayout();
  const { id, bookmark } = useLocalSearchParams<{ id: string; bookmark?: string }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const selectedBookmarkId = Array.isArray(bookmark) ? bookmark[0] : bookmark;

  const { data: tags } = useTags();
  const anchor = useMemo(() => tags?.find((t) => t.id === routeId), [tags, routeId]);
  const activeIds = useMemo(() => (routeId ? [routeId] : []), [routeId]);

  const list = useTaggedBookmarks(activeIds, !!routeId);
  const toggleRead = useToggleRead(null);
  const deleteBm = useDeleteBookmark(null);

  const [addOpen, setAddOpen] = useState(false);
  const [actionBm, setActionBm] = useState<BookmarkDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<BookmarkDto | null>(null);
  const [editTagsBm, setEditTagsBm] = useState<BookmarkDto | null>(null);

  const items = useMemo(() => flattenPages(list.data?.pages ?? []), [list.data]);

  const openReader = (b: BookmarkDto) => {
    if (hasDetailPane) {
      router.push({
        pathname: "/tags/[id]",
        params: { id: routeId ?? "", bookmark: b.id },
      });
      return;
    }
    router.push(`/reader/${b.id}`);
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
          router.replace({ pathname: "/tags/[id]", params: { id: routeId ?? "" } });
        }
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const loadMore = () => {
    if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  };

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
          omitTagIds={activeIds}
          onTagPress={(tagId) => {
            haptics.light();
            router.replace(`/tags/${tagId}`);
          }}
        />
      )}
      estimatedItemSize={108}
      contentContainerStyle={{ paddingBottom: spacing[96] }}
      refreshing={list.isFetching && !list.isFetchingNextPage}
      onRefresh={() => list.refetch()}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        list.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null
      }
    />
  );

  if (!routeId) return null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header
        title={anchor?.name ?? "Tag"}
        subtitle={
          anchor
            ? `${anchor.bookmarkCount} ${anchor.bookmarkCount === 1 ? "bookmark" : "bookmarks"}`
            : undefined
        }
        showBack
        right={
          <PressableScale
            style={styles.iconBtn}
            scaleTo={0.85}
            hitSlop={8}
            onPress={() => {
              haptics.light();
              router.push("/tags");
            }}
            accessibilityRole="button"
            accessibilityLabel="All tags"
          >
            <Ionicons name="pricetags-outline" size={22} color={palette.text} />
          </PressableScale>
        }
      />

      {list.error && !list.data ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.center}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load bookmarks"
            message={errorMessage(list.error)}
            action={<Button label="Retry" onPress={() => list.refetch()} />}
          />
        </ScreenContent>
      ) : items.length === 0 && !list.isLoading ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={styles.center}>
          <EmptyState
            icon="pricetag-outline"
            title="No bookmarks with this tag"
            message="Save a bookmark with this tag, or pick a different one."
          />
        </ScreenContent>
      ) : list.isLoading ? (
        <ScreenContent
          maxWidth={hasDetailPane ? layout.maxLibraryWidth : layout.maxContentWidth}
          style={styles.content}
        >
          <BookmarkListSkeleton />
        </ScreenContent>
      ) : hasDetailPane ? (
        <ScreenContent maxWidth={layout.maxLibraryWidth} style={styles.content}>
          <View style={styles.splitPane}>
            <View style={styles.listPane}>{listPane}</View>
            <View style={[styles.readerPane, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {selectedBookmarkId ? (
                <ReaderPane
                  bookmarkId={selectedBookmarkId}
                  embedded
                  safeBottom={false}
                  onBack={() => router.setParams({ bookmark: undefined })}
                />
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

      <FABLayer maxWidth={layout.maxContentWidth}>
        <FAB
          onPress={() => setAddOpen(true)}
          accessibilityLabel="Save bookmark"
          right={spacing[20]}
        />
      </FABLayer>

      <AddBookmarkSheet
        visible={addOpen}
        onDismiss={() => setAddOpen(false)}
        folderId={null}
        allowFolderSelection
        initialTagIds={activeIds}
      />

      <BookmarkActionsSheet
        visible={!!actionBm}
        bookmark={actionBm}
        onDismiss={() => setActionBm(null)}
        onToggleRead={onToggleRead}
        onMove={setMoveTarget}
        onDelete={onDelete}
        onEditTags={setEditTagsBm}
      />

      <MoveSheet
        visible={!!moveTarget}
        bookmark={moveTarget}
        fromFolderId={moveTarget?.folderId ?? null}
        onDismiss={() => setMoveTarget(null)}
      />

      <EditTagsSheet
        visible={!!editTagsBm}
        bookmark={editTagsBm}
        onDismiss={() => setEditTagsBm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  footer: { paddingVertical: spacing[20], alignItems: "center" },
});
