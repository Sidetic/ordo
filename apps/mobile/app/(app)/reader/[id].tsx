/**
 * Reader mode: distraction-free article rendering from cached markdown.
 * Renders instantly from the list cache; falls back to a detail fetch.
 */
import React, { useMemo, useRef } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../../src/components/ui/Header";
import { Text } from "../../../src/components/ui/Text";
import { Button } from "../../../src/components/ui/Button";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { Markdown } from "../../../src/components/reader/Markdown";
import { queryClient } from "../../../src/lib/query-client";
import { findBookmarkInCache } from "../../../src/lib/cache-helpers";
import { useBookmarkDetail, useToggleRead } from "../../../src/hooks/use-bookmarks";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { domainFromUrl, relativeTime } from "../../../src/lib/format";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { layout, spacing } from "../../../src/theme/tokens";

export default function ReaderScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookmarkId = Array.isArray(id) ? id[0] : id;

  const cached = useMemo(() => (bookmarkId ? findBookmarkInCache(queryClient, bookmarkId) : undefined), [bookmarkId]);
  const detail = useBookmarkDetail(bookmarkId, !cached?.contentMarkdown);

  const bookmark = detail.data ?? cached;
  const loading = !bookmark && detail.isLoading;
  const hasContent = !!bookmark?.contentMarkdown;

  // Auto-mark as read on open (once per bookmark).
  const toggleRead = useToggleRead(bookmark?.folderId ?? "");
  const markedRef = useRef<string | null>(null);
  React.useEffect(() => {
    if (bookmark && !bookmark.isRead && bookmark.folderId && markedRef.current !== bookmark.id) {
      markedRef.current = bookmark.id;
      toggleRead.mutate({ id: bookmark.id, isRead: true });
    }
  }, [bookmark?.id, bookmark?.isRead]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header
        title={domainFromUrl(bookmark?.url ?? "")}
        subtitle={bookmark ? relativeTime(bookmark.createdAt) : undefined}
        showBack
        right={
          bookmark ? (
            <PressableScale
              style={styles.iconBtn}
              scaleTo={0.85}
              hitSlop={8}
              onPress={() => {
                haptics.light();
                Linking.openURL(bookmark.url).catch(() => {});
              }}
            >
              <Ionicons name="open-outline" size={22} color={palette.text} />
            </PressableScale>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.body}>
          <Skeleton width="80%" height={28} />
          <Skeleton width="100%" height={16} style={{ marginTop: spacing[16] }} />
          <Skeleton width="100%" height={16} style={{ marginTop: spacing[8] }} />
          <Skeleton width="65%" height={16} style={{ marginTop: spacing[8] }} />
        </View>
      ) : !bookmark ? (
        <View style={styles.center}>
          <Text variant="title3">Couldn't load this bookmark</Text>
          {detail.error ? (
            <Text variant="body" color="secondary" style={{ marginTop: spacing[6], textAlign: "center" }}>
              {errorMessage(detail.error)}
            </Text>
          ) : null}
          <View style={{ height: spacing[16] }} />
          <Button label="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { maxWidth: layout.maxContentWidth }]}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="title2" style={styles.title}>{bookmark.title || domainFromUrl(bookmark.url)}</Text>
          {bookmark.description ? (
            <Text variant="callout" color="secondary" style={{ marginTop: spacing[10] }}>
              {bookmark.description}
            </Text>
          ) : null}

          {hasContent ? (
            <View style={{ marginTop: spacing[24] }}>
              <Markdown>{bookmark.contentMarkdown ?? ""}</Markdown>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="reader-outline" size={36} color={palette.textTertiary} />
              <Text variant="body" color="secondary" style={{ marginTop: spacing[12], textAlign: "center" }}>
                No readable content was captured for this page.
              </Text>
              <View style={{ height: spacing[16] }} />
              <Button label="Open original" onPress={() => Linking.openURL(bookmark.url).catch(() => {})} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing[20], paddingVertical: spacing[16], width: "100%", alignSelf: "center" },
  title: { lineHeight: 32 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[32] },
});
