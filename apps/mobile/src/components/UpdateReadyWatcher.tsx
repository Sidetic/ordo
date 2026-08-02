/**
 * Fires a transient "update ready — restart" toast the moment a downloaded
 * update is detected — once per update (deduped by the pending update id). The
 * persistent restart action also lives on the About screen's Updates card; this
 * is just the proactive, anywhere-in-the-app nudge. Renderless.
 */
import { useEffect, useRef } from "react";
import * as Updates from "expo-updates";
import { useOtaUpdate } from "../hooks/use-ota-update";
import { toast } from "./ui/toast-store";
import { haptics } from "../lib/haptics";

const UPDATE_TOAST_DURATION = 3000;

export function UpdateReadyWatcher() {
  const ota = useOtaUpdate();
  const lastShown = useRef<string | null>(null);

  useEffect(() => {
    if (!ota.enabled || ota.status !== "ready") return;
    const key = ota.pendingUpdateId ?? "__pending";
    if (key === lastShown.current) return;
    lastShown.current = key;

    haptics.light();
    toast.show("Update ready — restart to apply", {
      duration: UPDATE_TOAST_DURATION,
      swipeable: true,
      action: {
        label: "Restart",
        onPress: () => {
          if (!ota.enabled) return;
          Updates.reloadAsync().catch(() => {});
        },
      },
    });
  }, [ota.enabled, ota.status, ota.pendingUpdateId]);

  return null;
}
