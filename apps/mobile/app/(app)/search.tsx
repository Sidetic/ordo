/**
 * Global bookmark search (title, url, article text). Debounced + infinite.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/ui/Header";
import { ScreenContent } from "../../src/components/ui/ScreenContent";
import { Input } from "../../src/components/ui/Input";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Button } from "../../src/components/ui/Button";
import { BookmarkListSkeleton } from "../../src/components/ui/BookmarkListSkeleton";
import { BookmarkRow } from "../../src/components/bookmarks/BookmarkRow";
import { ExtractionProgressLine } from "../../src/components/bookmarks/ExtractionProgressLine";
import { TagChip } from "../../src/components/tags/TagChip";
import { ReaderPane, ReaderPanePlaceholder } from "../../src/components/reader/ReaderPane";
import { useInfiniteSearch } from "../../src/hooks/use-bookmarks";
import { useTags } from "../../src/hooks/use-tags";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import { useFloatingDockMetrics } from "../../src/hooks/use-floating-dock-metrics";
import { useTheme } from "../../src/theme/ThemeProvider";
import { flattenPages } from "../../src/lib/api/query-keys";
import { haptics } from "../../src/lib/haptics";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { errorMessage } from "../../src/lib/error-message";
import type { BookmarkDto } from "@ordo/shared";

export default function SearchScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string; bookmark?: string }>();
  const { hasDetailPane } = useResponsiveLayout();
  const {
    visible: floatingNavigation,
    sideNavigation,
    clearance: bottomClearance,
  } = useFloatingDockMetrics();
  const routeQuery = Array.isArray(params.query) ? params.query[0] ?? "" : params.query ?? "";
  const selectedBookmarkId = Array.isArray(params.bookmark)
    ? params.bookmark[0]
    : params.bookmark;
  const [input, setInput] = useState(routeQuery);
  const [q, setQ] = useState(routeQuery);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const { data: allTags } = useTags();
  const browsing = q.length > 0 || tagFilter.length > 0;

  // Debounce the query (300ms) so typing stays smooth.
  useEffect(() => {
    const t = setTimeout(() => {
      const nextQuery = input.trim();
      setQ(nextQuery);
      if (nextQuery !== routeQuery) {
        router.setParams({ query: nextQuery || undefined, bookmark: undefined });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [input, routeQuery, router]);

  const search = useInfiniteSearch(q, tagFilter);
  const items = useMemo(() => flattenPages(search.data?.pages ?? []), [search.data]);

  useEffect(() => {
    if (routeQuery !== q) {
      setInput(routeQuery);
      setQ(routeQuery);
    }
  }, [q, routeQuery]);

  const openReader = (b: BookmarkDto) => {
    if (hasDetailPane) {
      router.push({
        pathname: "/search",
        params: { query: q, bookmark: b.id },
      });
      return;
    }
    router.push(`/reader/${b.id}`);
  };

  const toggleTag = (tagId: string) => {
    haptics.selection();
    setTagFilter((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const listContentPadding = floatingNavigation
    ? bottomClearance
    : sideNavigation
      ? spacing[32]
      : spacing[96];
  const listPane = (
    <FlashList
      data={items}
      keyExtractor={(b: BookmarkDto) => b.id}
      renderItem={({ item }: { item: BookmarkDto }) => (
        <BookmarkRow
          bookmark={item}
          onPress={openReader}
          selected={hasDetailPane && item.id === selectedBookmarkId}
          onTagPress={toggleTag}
        />
      )}
      estimatedItemSize={108}
      contentContainerStyle={{ paddingBottom: listContentPadding }}
      onEndReached={() => {
        if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Search" large />
      <ExtractionProgressLine maxWidth={hasDetailPane ? layout.maxLibraryWidth : layout.maxContentWidth} />
      <ScreenContent
        maxWidth={hasDetailPane ? layout.maxLibraryWidth : layout.maxContentWidth}
        style={styles.content}
      >
        <View style={styles.searchWrap}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Search bookmarks…"
            autoFocus={false}
            icon={<Ionicons name="search-outline" size={18} color={palette.textTertiary} />}
            returnKeyType="search"
          />
          {allTags && allTags.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRail}
            >
              {allTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  selected={tagFilter.includes(tag.id)}
                  onPress={() => toggleTag(tag.id)}
                  accessibilityLabel={`Filter by ${tag.name}`}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {!browsing ? (
          <View style={styles.stateFill}>
            <EmptyState
              icon="search-outline"
              title="Search your library"
              message={
                (allTags?.length ?? 0) > 0
                  ? "Find bookmarks by title, URL, or article content, or pick a tag."
                  : "Find bookmarks by title, URL, or article content."
              }
            />
          </View>
        ) : search.isLoading ? (
          hasDetailPane ? (
            <View style={styles.splitPane}>
              <View style={styles.listPane}>
                <BookmarkListSkeleton count={4} />
              </View>
              <View style={[styles.readerPane, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <ReaderPanePlaceholder />
              </View>
            </View>
          ) : (
            <View style={styles.singlePane}>
              <BookmarkListSkeleton count={4} />
            </View>
          )
        ) : search.error ? (
          <View style={styles.stateFill}>
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't search bookmarks"
              message={errorMessage(search.error)}
              action={<Button label="Retry" onPress={() => search.refetch()} />}
            />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.stateFill}>
            <EmptyState
              icon="document-text-outline"
              title="No results"
              message={
                q
                  ? `Nothing matched "${q}".`
                  : "No bookmarks with these tags."
              }
            />
          </View>
        ) : hasDetailPane ? (
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
        ) : (
          <View style={styles.singlePane}>{listPane}</View>
        )}
      </ScreenContent>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: "100%" },
  searchWrap: { width: "100%", paddingBottom: spacing[12] },
  tagRail: { paddingTop: spacing[10], gap: spacing[6] },
  stateFill: { flex: 1, alignItems: "center", justifyContent: "center" },
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
});
