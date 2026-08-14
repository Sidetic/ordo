/**
 * A single bookmark row. Tapping opens the reader; the trailing button reveals
 * row actions. Unread items are marked with an accent dot.
 */
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { domainFromUrl, relativeTime } from "../../lib/format";
import { spacing } from "../../theme/tokens";
import type { BookmarkDto } from "@ordo/shared";

export interface BookmarkRowProps {
  bookmark: BookmarkDto;
  onPress: (b: BookmarkDto) => void;
  onMore?: (b: BookmarkDto) => void;
  selected?: boolean;
}

export function BookmarkRow({ bookmark, onPress, onMore, selected }: BookmarkRowProps) {
  const { palette } = useTheme();
  const titleColor = bookmark.isRead ? "secondary" : "primary";
  const domain = bookmark.domain || domainFromUrl(bookmark.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  const [failedFavicon, setFailedFavicon] = React.useState<string | null>(null);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: selected ? palette.accentSoft : "transparent",
          borderBottomColor: palette.border,
        },
      ]}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        style={styles.body}
        onPress={() => onPress(bookmark)}
      >
        <View style={styles.topRow}>
          <View style={[styles.dot, { backgroundColor: bookmark.isRead ? "transparent" : palette.accent }]} />
          {failedFavicon === faviconUrl ? (
            <Ionicons name="globe-outline" size={16} color={palette.textTertiary} />
          ) : (
            <Image
              source={{ uri: faviconUrl }}
              style={styles.favicon}
              resizeMode="contain"
              accessible={false}
              onError={() => setFailedFavicon(faviconUrl)}
            />
          )}
          <Text variant="monoSmall" color="tertiary" numberOfLines={1} style={styles.domain}>
            {domain}
          </Text>
          <Text variant="monoSmall" color="tertiary">·</Text>
          <Text variant="monoSmall" color="tertiary" numberOfLines={1}>{relativeTime(bookmark.createdAt)}</Text>
        </View>
        <Text variant="title3" color={titleColor} numberOfLines={2} style={{ marginTop: spacing[4] }}>
          {bookmark.title || domainFromUrl(bookmark.url)}
        </Text>
        {bookmark.description ? (
          <Text variant="footnote" color="secondary" numberOfLines={2} style={{ marginTop: spacing[4] }}>
            {bookmark.description}
          </Text>
        ) : null}
      </PressableScale>

      {onMore ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${bookmark.title || domainFromUrl(bookmark.url)}`}
          style={styles.moreBtn}
          scaleTo={0.85}
          onPress={() => onMore(bookmark)}
          hitSlop={12}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.textTertiary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingRight: spacing[4] },
  body: { flex: 1, paddingVertical: spacing[14], paddingHorizontal: spacing[16] },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing[6] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  favicon: { width: 16, height: 16, borderRadius: 3 },
  domain: { flexShrink: 1 },
  moreBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
