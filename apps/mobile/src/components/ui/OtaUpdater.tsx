/**
 * OTA update UI built on `expo-updates`.
 *  - <OtaUpdateCard />  full card for Settings (info + check + status)
 *  - <OtaUpdateLink />  compact inline control for auth screens
 *
 * expo-updates only runs in release builds, so both gracefully report a
 * disabled state during development.
 */
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { Button } from "./Button";
import { PressableScale } from "./PressableScale";
import { useOtaUpdate } from "../../hooks/use-ota-update";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return hash.length > 10 ? `${hash.slice(0, 8)}…` : hash;
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="footnote" color="tertiary">{label}</Text>
      <Text
        variant={mono ? "monoSmall" : "footnote"}
        color="secondary"
        numberOfLines={1}
        style={{ color: palette.textSecondary }}
      >
        {value}
      </Text>
    </View>
  );
}

function Status({ ota }: { ota: ReturnType<typeof useOtaUpdate> }) {
  const { palette } = useTheme();

  if (ota.status === "disabled") {
    return (
      <Text variant="footnote" color="tertiary" style={styles.statusNote}>
        Automatic updates run in production builds.
      </Text>
    );
  }
  if (ota.status === "checking") {
    return <StatusLine icon={<Spinner color={palette.textTertiary} />} text="Checking for updates…" />;
  }
  if (ota.status === "downloading") {
    return <StatusLine icon={<Spinner color={palette.textTertiary} />} text="Downloading update…" />;
  }
  if (ota.status === "up-to-date") {
    return <StatusLine icon={<Ionicons name="checkmark-circle" size={16} color={palette.green} />} text="You’re on the latest version" color={palette.text} />;
  }
  if (ota.status === "available") {
    return (
      <View style={styles.actionBlock}>
        <StatusLine icon={<Ionicons name="arrow-down-circle" size={16} color={palette.accent} />} text="A new update is available." color={palette.text} />
        <Button label="Download & restart" block size="md" onPress={() => { haptics.light(); ota.download(); }} style={styles.actionBtn} />
      </View>
    );
  }
  if (ota.status === "ready") {
    return (
      <View style={styles.actionBlock}>
        <StatusLine icon={<Ionicons name="sync-circle" size={16} color={palette.green} />} text="Update downloaded — restart to apply." color={palette.text} />
        <Button label="Restart now" block size="md" onPress={() => { haptics.medium(); ota.restart(); }} style={styles.actionBtn} />
      </View>
    );
  }
  if (ota.status === "error") {
    return (
      <View style={styles.actionBlock}>
        <StatusLine icon={<Ionicons name="alert-circle" size={16} color={palette.danger} />} text={ota.message ?? "Update check failed"} color={palette.danger} />
        <Button label="Retry" variant="secondary" block size="md" onPress={() => { haptics.light(); ota.check(); }} style={styles.actionBtn} />
      </View>
    );
  }
  return null;
}

function StatusLine({ icon, text, color }: { icon: React.ReactNode; text: string; color?: string }) {
  return (
    <View style={styles.statusLine}>
      {icon}
      <Text variant="footnote" style={{ flex: 1, color: color }} numberOfLines={3}>{text}</Text>
    </View>
  );
}

function Spinner({ color }: { color: string }) {
  return <ActivityIndicator size="small" color={color} style={{ width: 16, height: 16 }} />;
}

export function OtaUpdateCard() {
  const ota = useOtaUpdate();
  const { palette } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
      <Meta label="Version" value={`v${ota.version}`} />
      <Meta label="Channel" value={ota.channel ?? "—"} />
      <Meta label="Runtime" value={shortHash(ota.runtimeVersion)} mono />
      {ota.lastChecked ? (
        <Meta label="Last checked" value={ota.lastChecked.toLocaleTimeString()} />
      ) : null}

      <View style={styles.cardButtonWrap}>
        <Button
          label="Check for updates"
          block
          size="md"
          loading={ota.status === "checking"}
          disabled={!ota.enabled}
          onPress={() => { haptics.light(); ota.check(); }}
        />
      </View>

      <Status ota={ota} />
    </View>
  );
}

export function OtaUpdateLink() {
  const ota = useOtaUpdate();
  const { palette } = useTheme();

  if (!ota.enabled) return null;

  const busy = ota.status === "checking" || ota.status === "downloading";
  const label = (() => {
    const version = ota.version && ota.version !== "—" ? `v${ota.version}` : null;
    switch (ota.status) {
      case "checking": return "Checking…";
      case "downloading": return "Updating…";
      case "up-to-date": return version ? `${version} · Up to date` : "Up to date";
      case "available":
      case "ready": return "Restart to finish";
      case "error": return "Tap to retry";
      default: return version ? `${version} · Check for updates` : "Check for updates";
    }
  })();

  const onTap = () => {
    haptics.light();
    if (ota.status === "available") ota.download();
    else if (ota.status === "ready") ota.restart();
    else ota.check();
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
        <Ionicons name="refresh" size={13} color={ota.status === "error" ? palette.danger : palette.textTertiary} />
      )}
      <Text
        variant="footnote"
        color={ota.status === "error" ? "danger" : "tertiary"}
      >
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
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingVertical: spacing[8],
  },
});
