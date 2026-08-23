import React, { useMemo, useRef } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../ui/Header";
import { ScreenContent } from "../ui/ScreenContent";
import { Text } from "../ui/Text";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { PressableScale } from "../ui/PressableScale";
import { Markdown } from "./Markdown";
import { queryClient } from "../../lib/query-client";
import { findBookmarkInCache } from "../../lib/cache-helpers";
import { useBookmarkDetail, useToggleRead } from "../../hooks/use-bookmarks";
import { useTheme } from "../../theme/ThemeProvider";
import { domainFromUrl, relativeTime } from "../../lib/format";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { layout, spacing } from "../../theme/tokens";

export interface ReaderPaneProps {
  bookmarkId?: string;
  embedded?: boolean;
  onBack?: () => void;
  safeBottom?: boolean;
}

export function ReaderPane({
  bookmarkId,
  embedded = false,
  onBack,
  safeBottom = !embedded,
}: ReaderPaneProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const cached = useMemo(
    () => (bookmarkId ? findBookmarkInCache(queryClient, bookmarkId) : undefined),
    [bookmarkId],
  );
  const detail = useBookmarkDetail(
    bookmarkId ?? "",
    !!bookmarkId && !cached?.contentMarkdown,
    cached?.folderId,
  );

  const bookmark = detail.data ?? cached;
  const loading = !!bookmarkId && !bookmark && detail.isLoading;
  const hasContent = !!bookmark?.contentMarkdown;

  const toggleRead = useToggleRead(bookmark?.folderId ?? null);
  const markedRef = useRef<string | null>(null);

  React.useEffect(() => {
    // Auto-mark read on open — filed and unfiled (folderId null) alike.
    if (bookmark && !bookmark.isRead && markedRef.current !== bookmark.id) {
      markedRef.current = bookmark.id;
      toggleRead.mutate({ id: bookmark.id, isRead: true });
    }
  }, [bookmark?.id, bookmark?.isRead]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  const handleOpenOriginal = () => {
    if (!bookmark) return;
    haptics.light();
    Linking.openURL(bookmark.url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Header
        title={bookmark ? domainFromUrl(bookmark.url) : "Reader"}
        subtitle={bookmark ? relativeTime(bookmark.createdAt) : undefined}
        showBack={!embedded}
        onBack={!embedded ? onBack : undefined}
        safeTop={!embedded}
        maxWidth={layout.maxLibraryWidth}
        right={
          bookmark ? (
            <PressableScale
              style={styles.iconBtn}
              scaleTo={0.85}
              hitSlop={8}
              onPress={handleOpenOriginal}
            >
              <Ionicons name="open-outline" size={22} color={palette.text} />
            </PressableScale>
          ) : undefined
        }
      />

      {loading ? (
        <ScreenContent style={styles.stateBody}>
          <Skeleton width="80%" height={28} />
          <Skeleton width="100%" height={16} style={{ marginTop: spacing[16] }} />
          <Skeleton width="100%" height={16} style={{ marginTop: spacing[8] }} />
          <Skeleton width="65%" height={16} style={{ marginTop: spacing[8] }} />
        </ScreenContent>
      ) : !bookmark ? (
        <ScreenContent style={styles.stateCenter}>
          <Text variant="title3">Couldn't load this bookmark</Text>
          {detail.error ? (
            <Text variant="body" color="secondary" style={{ marginTop: spacing[6], textAlign: "center" }}>
              {errorMessage(detail.error)}
            </Text>
          ) : null}
          <View style={{ height: spacing[16] }} />
          <Button
            label={embedded ? "Retry" : "Go back"}
            variant="secondary"
            onPress={embedded ? () => detail.refetch() : handleBack}
          />
        </ScreenContent>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing[16],
            paddingBottom: spacing[16] + (safeBottom ? insets.bottom : 0),
          }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenContent style={styles.body}>
            <Text variant="title2" style={styles.title}>
              {bookmark.title || domainFromUrl(bookmark.url)}
            </Text>
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
              <View style={styles.inlineEmpty}>
                <Ionicons name="reader-outline" size={36} color={palette.textTertiary} />
                <Text
                  variant="body"
                  color="secondary"
                  style={{ marginTop: spacing[12], textAlign: "center" }}
                >
                  No readable content was captured for this page.
                </Text>
                <View style={{ height: spacing[16] }} />
                <Button label="Open original" onPress={handleOpenOriginal} />
              </View>
            )}
          </ScreenContent>
        </ScrollView>
      )}
    </View>
  );
}

export function ReaderPanePlaceholder() {
  const { palette } = useTheme();

  return (
    <ScreenContent style={styles.stateCenter}>
      <View
        style={[
          styles.placeholderIcon,
          { backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
        ]}
      >
        <Ionicons name="reader-outline" size={28} color={palette.textTertiary} />
      </View>
      <Text variant="title3" align="center" style={{ marginTop: spacing[16] }}>
        Select a bookmark
      </Text>
      <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[6] }}>
        Choose a bookmark from the list to preview it here.
      </Text>
    </ScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { width: "100%" },
  title: { lineHeight: 32 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  stateBody: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
  },
  stateCenter: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
  },
  inlineEmpty: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[32],
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
