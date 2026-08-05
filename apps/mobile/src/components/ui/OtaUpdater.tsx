/**
 * OTA update UI built on `expo-updates`.
 *  - <OtaUpdateCard />  status card for the About screen (check / download / restart)
 *  - <OtaUpdateLink />  compact inline control for auth screens
 *
 * expo-updates only runs in release builds, so both gracefully report a
 * disabled state during development. Status swaps cross-fade via Reanimated
 * entering/exiting transitions, and the card animates its height with a layout
 * transition so changes never jump.
 */
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { Text } from "./Text";
import { Button } from "./Button";
import { PressableScale } from "./PressableScale";
import { toast } from "./toast-store";
import { useOtaUpdate } from "../../hooks/use-ota-update";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";

function StatusLine({ icon, text, color }: { icon: React.ReactNode; text: string; color?: string }) {
  return (
    <View style={styles.statusLine}>
      {icon}
      <Text variant="footnote" style={{ flex: 1, color }} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

function Spinner({ color }: { color: string }) {
  return <ActivityIndicator size="small" color={color} style={{ width: 16, height: 16 }} />;
}

function Status({ ota }: { ota: ReturnType<typeof useOtaUpdate> }) {
  const { palette } = useTheme();

  // Checking is already communicated by the button spinner. A successful
  // no-update result is surfaced as a toast instead of adding another row.
  if (ota.status === "idle" || ota.status === "checking" || ota.status === "up-to-date") return null;

  // Remount on status change so entering/exiting produce a clean cross-fade.
  return (
    <Animated.View
      key={ota.status}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
    >
      {ota.status === "disabled" ? (
        <Text variant="footnote" color="tertiary" style={styles.statusNote}>
          Automatic updates run in production builds.
        </Text>
      ) : ota.status === "downloading" ? (
        <StatusLine icon={<Spinner color={palette.textTertiary} />} text="Downloading update…" />
      ) : ota.status === "available" ? (
        <View style={styles.actionBlock}>
          <StatusLine
            icon={<Ionicons name="arrow-down-circle" size={16} color={palette.accent} />}
            text="A new update is available."
            color={palette.text}
          />
          <Button
            label="Download update"
            block
            size="md"
            onPress={() => {
              haptics.light();
              void ota.download();
            }}
            style={styles.actionBtn}
          />
        </View>
      ) : ota.status === "ready" ? (
        <View style={styles.actionBlock}>
          <StatusLine
            icon={<Ionicons name="sync-circle" size={16} color={palette.green} />}
            text="Update downloaded — restart to apply."
            color={palette.text}
          />
          <Button
            label="Restart now"
            block
            size="md"
            onPress={() => {
              haptics.medium();
              void ota.restart();
            }}
            style={styles.actionBtn}
          />
        </View>
      ) : ota.status === "error" ? (
        <View style={styles.actionBlock}>
          <StatusLine
            icon={<Ionicons name="alert-circle" size={16} color={palette.danger} />}
            text={ota.message ?? "Update check failed"}
            color={palette.danger}
          />
          <Button
            label="Retry"
            variant="secondary"
            block
            size="md"
            onPress={() => {
              haptics.light();
              void ota.check();
            }}
            style={styles.actionBtn}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

export function OtaUpdateCard() {
  const ota = useOtaUpdate();
  const { palette } = useTheme();
  const manualCheck = React.useRef(false);

  React.useEffect(() => {
    if (!manualCheck.current) return;
    if (ota.status === "up-to-date") {
      manualCheck.current = false;
      toast.show("You’re up to date.", { tone: "success", duration: 3000 });
    } else if (ota.status !== "checking" && ota.status !== "idle") {
      manualCheck.current = false;
    }
  }, [ota.status]);

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}
    >
      <Meta label="Channel" value={ota.channel ?? "—"} />
      <Meta label="Last checked" value={ota.lastChecked ? ota.lastChecked.toLocaleString() : "—"} />

      <View style={styles.cardButtonWrap}>
        <Button
          label="Check for updates"
          block
          size="md"
          loading={ota.status === "checking"}
          disabled={!ota.enabled}
          onPress={() => {
            manualCheck.current = true;
            haptics.light();
            void ota.check().catch(() => {});
          }}
        />
      </View>

      <Status ota={ota} />
    </Animated.View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="footnote" color="tertiary">
        {label}
      </Text>
      <Text variant="footnote" numberOfLines={1} style={{ color: palette.textSecondary, flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export function OtaUpdateLink() {
  const ota = useOtaUpdate();
  const { palette } = useTheme();

  if (!ota.enabled) return null;

  const busy = ota.status === "checking" || ota.status === "downloading";
  const label = (() => {
    switch (ota.status) {
      case "checking":
        return "Checking…";
      case "downloading":
        return "Updating…";
      case "up-to-date":
        return "Up to date";
      case "available":
      case "ready":
        return "Restart to finish";
      case "error":
        return "Tap to retry";
      default:
        return "Check for updates";
    }
  })();

  const onTap = () => {
    haptics.light();
    if (ota.status === "ready") void ota.restart();
    else if (ota.status === "available") void ota.download();
    else void ota.check();
  };

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Check for app updates"
      scaleTo={0.96}
      onPress={onTap}
      style={styles.link}
    >
      {busy ? (
        <Spinner color={palette.textTertiary} />
      ) : (
        <Ionicons
          name="refresh"
          size={13}
          color={ota.status === "error" ? palette.danger : palette.textTertiary}
        />
      )}
      <Text variant="footnote" color={ota.status === "error" ? "danger" : "tertiary"}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing[16],
    gap: spacing[6],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  cardButtonWrap: { marginTop: spacing[8] },
  actionBlock: { marginTop: spacing[10], gap: spacing[10] },
  actionBtn: { width: "100%" },
  statusNote: { marginTop: spacing[4] },
  statusLine: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingVertical: spacing[8],
  },
});
