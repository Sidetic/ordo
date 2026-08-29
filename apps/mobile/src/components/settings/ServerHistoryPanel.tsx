/**
 * Last-three server recents with an explicit health check before reconnect.
 * Tapping Reconnect probes in isolation; switching still requires confirm.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { SettingsSectionLabel } from "./SettingsPage";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PressableScale } from "../ui/PressableScale";
import { ServerProbeLog } from "../ui/ServerProbeLog";
import { Text } from "../ui/Text";
import { timeAgo } from "../../lib/format";
import { hostOf, type ProbeStep } from "../../lib/server-probe";
import {
  schemeOf,
  type ServerHistoryEntry,
} from "../../lib/server-history";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export function ServerHistoryPanel({
  entries,
  probingUrl,
  steps,
  probing,
  busy,
  onReconnect,
  onRemove,
  onChangeServer,
}: {
  entries: ServerHistoryEntry[];
  probingUrl: string | null;
  steps: ProbeStep[];
  probing: boolean;
  busy: boolean;
  onReconnect: (url: string) => void;
  onRemove: (url: string) => void;
  onChangeServer: () => void;
}) {
  const { palette } = useTheme();

  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        icon="time-outline"
        title="No recent servers"
        message="The last three servers you leave will show up here, so you can reconnect after a health check."
        action={<Button label="Change server" onPress={onChangeServer} />}
      />
    );
  }

  return (
    <View>
      <SettingsSectionLabel compact>Recent servers</SettingsSectionLabel>
      <View style={styles.list}>
        {entries.map((entry, index) => {
          const host = hostOf(entry.url);
          const scheme = schemeOf(entry.url);
          const active = probingUrl === entry.url;
          const reconnectDisabled = busy || (probing && !active);
          const removeDisabled = busy || probing;

          return (
            <View
              key={entry.url}
              style={[
                styles.card,
                {
                  backgroundColor: active ? palette.accentSoft : palette.surface,
                  borderColor: active ? palette.accent : palette.border,
                },
              ]}
            >
              <View style={styles.cardHead}>
                <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
                  <Ionicons
                    name={active ? "pulse-outline" : "cloud-outline"}
                    size={18}
                    color={active ? palette.accent : palette.blue}
                  />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text variant="bodyStrong" numberOfLines={1} style={styles.host}>
                      {host}
                    </Text>
                    {scheme ? (
                      <Badge tone={scheme === "https" ? "green" : "neutral"}>
                        {scheme === "https" ? "HTTPS" : "HTTP"}
                      </Badge>
                    ) : null}
                  </View>
                  <Text variant="monoSmall" color="tertiary" numberOfLines={1}>
                    {entry.url}
                  </Text>
                  <Text variant="footnote" color="tertiary">
                    Last used {timeAgo(new Date(entry.lastConnectedAt).toISOString())}
                  </Text>
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${host} from history`}
                  accessibilityState={{ disabled: removeDisabled }}
                  hitSlop={8}
                  disabled={removeDisabled}
                  onPress={() => onRemove(entry.url)}
                  style={[styles.remove, { opacity: removeDisabled ? 0.4 : 1 }]}
                >
                  <Ionicons name="close" size={18} color={palette.textTertiary} />
                </PressableScale>
              </View>

              {active && probing ? (
                <Text variant="caption" color="secondary" style={styles.probeHint}>
                  Checking this server before switching
                </Text>
              ) : null}
              {active && (probing || steps.length > 0) ? (
                <Animated.View entering={FadeIn.duration(180)}>
                  <ServerProbeLog steps={steps} probing={probing} style={styles.probeLog} />
                </Animated.View>
              ) : null}

              <Button
                label={active && probing ? "Checking…" : "Reconnect"}
                variant={index === 0 ? "primary" : "secondary"}
                block
                disabled={reconnectDisabled}
                loading={active && probing}
                onPress={() => onReconnect(entry.url)}
                style={styles.reconnect}
              />
            </View>
          );
        })}
      </View>
      <Text variant="caption" color="tertiary" style={styles.footer}>
        Ordo keeps the last three servers you leave. Reconnect always runs a health
        check, then signs you out and restarts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[10] },
  card: {
    borderWidth: 1,
    borderRadius: radius["2xl"],
    padding: spacing[14],
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing[12] },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0, gap: spacing[2] },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  host: { flex: 1, minWidth: 0 },
  remove: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -spacing[4],
    marginRight: -spacing[4],
  },
  probeHint: { marginTop: spacing[12], letterSpacing: 0.4 },
  probeLog: { marginTop: spacing[12] },
  reconnect: { marginTop: spacing[14] },
  footer: { paddingHorizontal: spacing[4], paddingTop: spacing[12] },
});
