import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "./ui/FloatingPanel";
import { Button } from "./ui/Button";
import { Text } from "./ui/Text";
import { toast } from "./ui/toast-store";
import { useNativeUpdateStore } from "../store/native-update";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";

export function NativeUpdateProgress() {
  const { palette } = useTheme();
  const update = useNativeUpdateStore();
  const visible =
    update.status === "downloading" ||
    (update.status === "downloaded" && !!update.downloadedUri) ||
    (update.status === "error" && (!!update.downloadedUri || update.progress > 0));
  const downloading = update.status === "downloading";
  const downloadFailed = update.status === "error" && !update.downloadedUri;
  const percent = Math.round(update.progress * 100);

  return (
    <FloatingPanel
      visible={visible}
      onDismiss={downloading ? () => {} : update.dismissDownload}
      maxWidth={380}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}>
          <Ionicons name="phone-portrait-outline" size={22} color={palette.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="title1">
            {downloading
              ? "Downloading update"
              : downloadFailed
                ? "Download interrupted"
                : "Ready to install"}
          </Text>
          <Text variant="footnote" color="secondary" style={styles.subtitle}>
            {downloading
              ? "Keep Ordo open while the new app version downloads."
              : downloadFailed
                ? "The app update couldn't be downloaded. Your current version is unchanged."
                : `Ordo v${update.release?.version ?? ""} has downloaded.`}
          </Text>
        </View>
      </View>

      {downloading ? (
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSecondary }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: palette.accent, width: `${percent}%` },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text variant="monoSmall" color="secondary">Downloading</Text>
            <Text variant="monoSmall" color="accent">{percent}%</Text>
          </View>
        </View>
      ) : downloadFailed ? (
        <View style={styles.actions}>
          <Text variant="footnote" color="danger" align="center" style={styles.error}>
            {update.error ?? "Couldn't download the update."}
          </Text>
          <Button
            label="Retry"
            size="lg"
            block
            onPress={() =>
              update
                .downloadAndInstall()
                .catch(() => toast.error("Couldn't download the update."))
            }
          />
          <Button label="Later" variant="ghost" block onPress={update.dismissDownload} />
        </View>
      ) : (
        <View style={styles.actions}>
          {update.error ? (
            <Text variant="footnote" color="danger" align="center" style={styles.error}>
              {update.error}
            </Text>
          ) : null}
          <Button
            label="Open installer"
            size="lg"
            block
            icon={<Ionicons name="open-outline" size={17} color={palette.onAccent} />}
            onPress={() =>
              update.install().catch(() => toast.error("Couldn't open the installer."))
            }
          />
          <Button label="Later" variant="ghost" block onPress={update.dismissDownload} />
        </View>
      )}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing[12] },
  headerCopy: { flex: 1 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { marginTop: spacing[4] },
  progressSection: { marginTop: spacing[24] },
  progressTrack: { height: 8, borderRadius: radius.full, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: radius.full },
  progressMeta: {
    marginTop: spacing[8],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: { marginTop: spacing[20], gap: spacing[4] },
  error: { marginBottom: spacing[12] },
});
