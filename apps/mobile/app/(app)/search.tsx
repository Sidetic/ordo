/**
 * Global bookmark search (title, url, article text). Debounced + infinite.
 */
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/ui/Header";
import { Input } from "../../src/components/ui/Input";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { BookmarkListSkeleton } from "../../src/components/ui/BookmarkListSkeleton";
import { BookmarkRow } from "../../src/components/bookmarks/BookmarkRow";
import { useInfiniteSearch } from "../../src/hooks/use-bookmarks";
import { useTheme } from "../../src/theme/ThemeProvider";
import { flattenPages } from "../../src/lib/api/query-keys";
import { spacing } from "../../src/theme/tokens";
import { useSettingsStore } from "../../src/store/settings";
import type { BookmarkDto } from "@ordo/shared";

export default function SearchScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const floatingNavigation = useSettingsStore((s) => s.navigationStyle === "floating");
  const bottomClearance = spacing[96] + Math.max(insets.bottom - spacing[12], 0);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");

  // Debounce the query (300ms) so typing stays smooth.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const search = useInfiniteSearch(q);
  const items = useMemo(() => flattenPages(search.data?.pages ?? []), [search.data]);

  const openReader = (b: BookmarkDto) => router.push(`/reader/${b.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Search" large />
      <View style={styles.searchWrap}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="Search bookmarks…"
          autoFocus={false}
          icon={<Ionicons name="search-outline" size={18} color={palette.textTertiary} />}
          returnKeyType="search"
        />
      </View>

      {!q ? (
        <EmptyState
          icon="search-outline"
          title="Search your library"
          message="Find bookmarks by title, URL, or article content."
        />
      ) : search.isLoading ? (
        <BookmarkListSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No results" message={`Nothing matched "${q}".`} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(b: BookmarkDto) => b.id}
          renderItem={({ item }: { item: BookmarkDto }) => (
            <BookmarkRow bookmark={item} onPress={openReader} onMore={() => {}} />
          )}
          estimatedItemSize={108}
          contentContainerStyle={{ paddingBottom: floatingNavigation ? bottomClearance : spacing[96] }}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing[16], paddingBottom: spacing[12] },
});
