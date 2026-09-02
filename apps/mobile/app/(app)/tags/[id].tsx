/**
 * Tag browse: whole-library bookmark list filtered by one or more tags
 * (AND semantics). The route's tag anchors the filter; others can be toggled
 * from a horizontal chip rail.
 */
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Header } from "../../../src/components/ui/Header";
import { FAB, FABLayer } from "../../../src/components/ui/FAB";
import { Button } from "../../../src/components/ui/Button";
import { ScreenContent } from "../../../src/components/ui/ScreenContent";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { BookmarkListSkeleton } from "../../../src/components/ui/BookmarkListSkeleton";
import { BookmarkRow } from "../../../src/components/bookmarks/BookmarkRow";
import { AddBookmarkSheet } from "../../../src/components/bookmarks/AddBookmarkSheet";
import { BookmarkActionsSheet } from "../../../src/components/bookmarks/BookmarkActionsSheet";
import { MoveSheet } from "../../../src/components/bookmarks/MoveSheet";
import { EditTagsSheet } from "../../../src/components/tags/EditTagsSheet";
import { TagChip } from "../../../src/components/tags/TagChip";
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
import { opensBookmarkExternally } from "../../../src/lib/bookmark-reader";
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

  const [extraIds, setExtraIds] = useState<string[]>([]);
  const activeIds = useMemo(
    () => (routeId ? [routeId, ...extraIds.filter((tagId) => tagId !== routeId)] : []),
    [routeId, extraIds],
  );

  const list = useTaggedBookmarks(activeIds, !!routeId);
  const toggleRead = useToggleRead(null);
  const deleteBm = useDeleteBookmark(null);

  const [addOpen, setAddOpen] = useState(false);
  const [actionBm, setActionBm] = useState<BookmarkDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<BookmarkDto | null>(null);
  const [editTagsBm, setEditTagsBm] = useState<BookmarkDto | null>(null);

  const items = useMemo(() => flattenPages(list.data?.pages ?? []), [list.data]);

  const openReader = (b: BookmarkDto) => {
    if (opensBookmarkExternally(b)) {
      haptics.light();
      if (!b.isRead) toggleRead.mutate({ id: b.id, isRead: true });
      void Linking.openURL(b.url).catch(() => router.push(`/reader/${b.id}`));
      return;
    }
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

  const toggleExtra = (tagId: string) => {
    haptics.selection();
    setExtraIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
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
          onTagPress={(tagId) => {
            if (tagId === routeId) return;
            toggleExtra(tagId);
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
          activeIds.length > 1
            ? `${activeIds.length} tags`
            : anchor
              ? `${anchor.bookmarkCount} ${anchor.bookmarkCount === 1 ? "bookmark" : "bookmarks"}`
              : undefined
        }
        showBack
      />

      {tags && tags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRail}
        >
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              count={tag.bookmarkCount}
              selected={activeIds.includes(tag.id)}
              onPress={() => {
                if (tag.id === routeId) return; // anchor stays selected
                toggleExtra(tag.id);
              }}
              accessibilityLabel={`Filter by ${tag.name}`}
            />
          ))}
        </ScrollView>
      ) : null}

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
            title="No bookmarks with these tags"
            message="Try removing a tag from the filter."
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
  tagRail: { paddingHorizontal: spacing[16], paddingVertical: spacing[10], gap: spacing[8] },
  footer: { paddingVertical: spacing[20], alignItems: "center" },
});
