/** Stable About-page update row; outcomes are surfaced by actionable toasts. */
import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "./Button";
import { SettingRow } from "./SettingRow";
import { toast } from "./toast-store";
import { useOtaUpdate } from "../../hooks/use-ota-update";
import { haptics } from "../../lib/haptics";

function showDownloadPrompt(ota: ReturnType<typeof useOtaUpdate>) {
  toast.show("A new update is available", {
    duration: 6000,
    swipeable: true,
    action: {
      label: "Download",
      onPress: () => ota.download().catch(() => toast.error("Update download failed")),
    },
  });
}

function showRestartPrompt(ota: ReturnType<typeof useOtaUpdate>) {
  toast.show("Update ready — restart to apply", {
    duration: 6000,
    swipeable: true,
    action: {
      label: "Restart",
      onPress: () => ota.restart().catch(() => toast.error("Update restart failed")),
    },
  });
}

export function OtaUpdateCard() {
  const ota = useOtaUpdate();
  const manualCheck = React.useRef(false);

  React.useEffect(() => {
    if (!manualCheck.current) return;

    if (ota.status === "up-to-date") {
      manualCheck.current = false;
      toast.show("You’re up to date.", { tone: "success", duration: 3000 });
    } else if (ota.status === "error") {
      manualCheck.current = false;
      toast.show(ota.message ?? "Update check failed", {
        tone: "danger",
        duration: 5000,
        action: {
          label: "Retry",
          onPress: () => {
            manualCheck.current = true;
            void ota.check().catch(() => {});
          },
        },
      });
    } else if (ota.status !== "checking" && ota.status !== "idle") {
      manualCheck.current = false;
    }
  }, [ota]);

  const channel = ota.channel ?? "default";
  const description = !ota.enabled
    ? "Automatic updates are available in production builds."
    : `${channel.charAt(0).toUpperCase()}${channel.slice(1)} channel`;

  return (
    <SettingRow
      icon="cloud-download-outline"
      label="Software updates"
      description={description}
      right={
        <Button
          label={ota.status === "checking" ? "Checking" : "Check"}
          size="md"
          loading={ota.status === "checking"}
          disabled={!ota.enabled || ota.status === "downloading"}
          style={styles.checkButton}
          onPress={() => {
            haptics.light();
            if (ota.status === "available") {
              showDownloadPrompt(ota);
              return;
            }
            if (ota.status === "ready") {
              showRestartPrompt(ota);
              return;
            }
            manualCheck.current = true;
            void ota.check().catch(() => {});
          }}
        />
      }
      divider={false}
    />
  );
}

const styles = StyleSheet.create({
  checkButton: { minWidth: 104 },
});
