/**
 * Announces available and downloaded updates once per update id. Renderless.
 */
import { useEffect, useRef } from "react";
import { useOtaUpdate } from "../hooks/use-ota-update";
import { restartForUpdate } from "../store/update-restart";
import { toast } from "./ui/toast-store";
import { haptics } from "../lib/haptics";

const UPDATE_TOAST_DURATION = 3000;

export function UpdateReadyWatcher() {
  const ota = useOtaUpdate();
  const lastAvailableShown = useRef<string | null>(null);
  const lastReadyShown = useRef<string | null>(null);

  useEffect(() => {
    if (!ota.enabled || ota.status !== "available") return;
    const key = ota.availableUpdateId ?? "__available";
    if (key === lastAvailableShown.current) return;
    lastAvailableShown.current = key;

    haptics.light();
    toast.show("A new update is available", {
      duration: 6000,
      swipeable: true,
      action: {
        label: "Download",
        onPress: () => ota.download().catch(() => toast.error("Update download failed")),
      },
    });
  }, [ota.availableUpdateId, ota.download, ota.enabled, ota.status]);

  useEffect(() => {
    if (!ota.enabled || ota.status !== "ready") return;
    const key = ota.pendingUpdateId ?? "__pending";
    if (key === lastReadyShown.current) return;
    lastReadyShown.current = key;

    haptics.light();
    toast.show("Update ready — restart to apply", {
      duration: UPDATE_TOAST_DURATION,
      swipeable: true,
      action: {
        label: "Restart",
        onPress: () => {
          if (!ota.enabled) return;
          restartForUpdate().catch(() => toast.error("Update restart failed"));
        },
      },
    });
  }, [ota.enabled, ota.status, ota.pendingUpdateId]);

  return null;
}
