/** Unified About-page update row for OTA bundles and native app releases. */
import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "./Button";
import { SettingRow } from "./SettingRow";
import { toast } from "./toast-store";
import { useAppUpdate } from "../../hooks/use-app-update";

export function OtaUpdateCard() {
  const update = useAppUpdate();
  const { ota, native } = update;
  const manualCheck = React.useRef(false);

  React.useEffect(() => {
    if (!manualCheck.current) return;

    if (!update.checking && !update.kind && !update.error) {
      manualCheck.current = false;
      toast.show("You're up to date", { tone: "success", duration: 3000 });
    } else if (!update.checking && update.kind) {
      manualCheck.current = false;
    } else if (!update.checking && update.error) {
      manualCheck.current = false;
      toast.show(ota.message ?? native.error ?? "Couldn't check for updates.", {
        tone: "danger",
        duration: 5000,
        action: {
          label: "Retry",
          onPress: () => {
            manualCheck.current = true;
            void update.check().catch(() => {});
          },
        },
      });
    }
  }, [native.error, ota.message, update]);

  const channel = ota.channel ?? "default";
  const description = !update.enabled
    ? "Automatic updates are available in production builds."
    : native.status === "downloading"
      ? `Downloading Ordo v${native.release?.version ?? ""}…`
      : update.kind === "native" && native.release
        ? `Version ${native.release.version} is ready to install.`
        : update.kind === "ota" && ota.status === "ready"
          ? "Quick update downloaded. Restart to apply."
          : update.kind === "ota"
            ? "A quick update is available."
            : `${channel.charAt(0).toUpperCase()}${channel.slice(1)} channel`;

  const buttonLabel = update.checking
    ? "Checking…"
    : update.kind === "native"
      ? "Install"
      : ota.status === "ready"
        ? "Restart"
        : ota.status === "available"
          ? "Download"
          : "Check";

  return (
    <SettingRow
      icon="cloud-download-outline"
      label="App updates"
      description={description}
      right={
        <Button
          label={buttonLabel}
          size="md"
          loading={update.checking || native.status === "downloading"}
          disabled={!update.enabled || ota.status === "downloading"}
          style={styles.checkButton}
          onPress={() => {
            if (update.kind === "native") {
              void native
                .downloadAndInstall()
                .catch(() => toast.error("Couldn't download the update."));
              return;
            }
            if (update.kind === "ota" && ota.status === "available") {
              void ota.download().catch(() => toast.error("Couldn't download the update."));
              return;
            }
            if (update.kind === "ota" && ota.status === "ready") {
              void ota.restart().catch(() => toast.error("Couldn't restart to apply the update."));
              return;
            }
            manualCheck.current = true;
            void update.check().catch(() => {});
          }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  checkButton: { minWidth: 104 },
});
