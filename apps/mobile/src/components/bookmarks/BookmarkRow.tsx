/**
 * A single bookmark row. Tapping opens the reader; the trailing button reveals
 * row actions. The title leads the hierarchy, while source and status details
 * sit in a quieter metadata line. Unread items are marked on the favicon.
 */
import React from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { domainFromUrl, relativeTime } from "../../lib/format";
import { radius, spacing } from "../../theme/tokens";
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
  const title = bookmark.title || domain;
  const createdLabel = relativeTime(bookmark.createdAt);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  const [failedFavicon, setFailedFavicon] = React.useState<string | null>(null);
  const opensInBrowser =
    bookmark.fetchStatus === "unsupported" || bookmark.fetchStatus === "failed";
  const isPending = bookmark.fetchStatus === "pending";
  const accessibilityLabel = [
    title,
    domain,
    createdLabel,
    !bookmark.isRead ? "Unread" : undefined,
    isPending ? "Article processing" : undefined,
    opensInBrowser ? "Opens in browser" : undefined,
  ]
    .filter(Boolean)
    .join(", ");

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
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: !!selected }}
        style={styles.body}
        onPress={() => onPress(bookmark)}
        onLongPress={onMore ? () => onMore(bookmark) : undefined}
      >
        <View
          style={[
            styles.faviconFrame,
            { backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
          ]}
        >
          {failedFavicon === faviconUrl ? (
            <Ionicons
              name="globe-outline"
              size={18}
              color={palette.textTertiary}
              accessible={false}
            />
          ) : (
            <Image
              source={{ uri: faviconUrl }}
              style={styles.favicon}
              resizeMode="contain"
              accessible={false}
              onError={() => setFailedFavicon(faviconUrl)}
            />
          )}
          {!bookmark.isRead ? (
            <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} />
          ) : null}
        </View>

        <View style={styles.content}>
          <Text variant="headline" color={titleColor} numberOfLines={2}>
            {title}
          </Text>
          {bookmark.description ? (
            <Text variant="footnote" color="secondary" numberOfLines={1} style={styles.description}>
              {bookmark.description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.domain}>
              {domain}
            </Text>
            <View style={[styles.separator, { backgroundColor: palette.textFaint }]} />
            <Text variant="caption" color="tertiary" numberOfLines={1}>
              {createdLabel}
            </Text>
            {bookmark.readingTimeMinutes ? (
              <>
                <View style={[styles.separator, { backgroundColor: palette.textFaint }]} />
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  {bookmark.readingTimeMinutes} min read
                </Text>
              </>
            ) : null}
            {isPending ? (
              <ActivityIndicator
                size="small"
                color={palette.textTertiary}
                style={styles.statusIcon}
                accessible={false}
              />
            ) : opensInBrowser ? (
              <Ionicons
                name="open-outline"
                size={13}
                color={palette.textTertiary}
                style={styles.statusIcon}
                accessible={false}
              />
            ) : null}
          </View>
        </View>
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
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: spacing[8],
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[14],
    paddingLeft: spacing[16],
    paddingRight: spacing[8],
  },
  faviconFrame: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  favicon: { width: 20, height: 20, borderRadius: radius.xs },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  content: { flex: 1, minWidth: 0 },
  description: { marginTop: spacing[4] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing[6], marginTop: spacing[8] },
  domain: { flexShrink: 1 },
  separator: { width: 3, height: 3, borderRadius: radius.full },
  statusIcon: { marginLeft: spacing[2] },
  moreBtn: {
    width: 40,
    height: 40,
    marginTop: spacing[10],
    alignItems: "center",
    justifyContent: "center",
  },
});
