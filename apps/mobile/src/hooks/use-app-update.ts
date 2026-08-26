import { useEffect } from "react";
import { AppState } from "react-native";
import { useOtaUpdate } from "./use-ota-update";
import { useNativeUpdateStore } from "../store/native-update";

const FOREGROUND_RECHECK_MS = 60 * 60 * 1000;
let lastNativeForegroundCheck = 0;

export function useAppUpdate() {
  const ota = useOtaUpdate();
  const native = useNativeUpdateStore();

  useEffect(() => {
    void native.hydrate();
    const runCheck = () => {
      const now = Date.now();
      if (now - lastNativeForegroundCheck < FOREGROUND_RECHECK_MS) return;
      lastNativeForegroundCheck = now;
      void native.check().catch(() => {});
    };
    runCheck();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") runCheck();
    });
    return () => subscription.remove();
  }, [native.check, native.hydrate]);

  const otaDate =
    ota.status === "ready"
      ? ota.pendingUpdateCreatedAt
      : ota.status === "available"
        ? ota.availableUpdateCreatedAt
        : null;
  const nativeDate = native.release ? new Date(native.release.publishedAt) : null;
  const nativeIsActionable =
    !!native.release && (native.status === "available" || native.status === "error");
  const nativeIsLatest =
    nativeIsActionable &&
    (!otaDate || !nativeDate || nativeDate.getTime() >= otaDate.getTime());
  const kind = nativeIsLatest
    ? "native"
    : ota.status === "available" || ota.status === "ready"
      ? "ota"
      : null;

  const check = async () => {
    const results = await Promise.allSettled([ota.check(), native.check(true)]);
    if (results.every((result) => result.status === "rejected")) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
  };

  const checking = ota.status === "checking" || native.status === "checking";
  const error = !!(ota.message || native.error);

  return {
    ota,
    native,
    kind,
    checking,
    error,
    enabled: ota.enabled || native.status !== "disabled",
    check,
  } as const;
}
