/**
 * OTA update hook — wraps `expo-updates` for manual check / download / restart.
 * In development builds `expo-updates` is disabled and its async APIs reject, so
 * every action guards on `enabled` and surfaces a disabled state instead.
 */
import { useCallback, useState } from "react";
import * as Updates from "expo-updates";
import Constants from "expo-constants";

export type OtaStatus =
  | "disabled"
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UseOtaUpdate {
  enabled: boolean;
  version: string;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  status: OtaStatus;
  message: string | null;
  lastChecked: Date | null;
  check: () => Promise<void>;
  download: () => Promise<void>;
  restart: () => Promise<void>;
}

export function useOtaUpdate(): UseOtaUpdate {
  const enabled = Updates.isEnabled;
  const version = Constants.expoConfig?.version ?? "—";

  const [status, setStatus] = useState<OtaStatus>(enabled ? "idle" : "disabled");
  const [message, setMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const guard = useCallback(() => {
    if (!enabled) {
      setStatus("disabled");
      setMessage("Updates are disabled in development builds.");
      return false;
    }
    return true;
  }, [enabled]);

  const check = useCallback(async () => {
    if (!guard()) return;
    setStatus("checking");
    setMessage(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      setLastChecked(new Date());
      if (result.isAvailable) {
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Couldn’t check for updates.");
    }
  }, [guard]);

  const download = useCallback(async () => {
    if (!guard()) return;
    setStatus("downloading");
    setMessage(null);
    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        setStatus("ready");
      } else {
        setLastChecked(new Date());
        setStatus("up-to-date");
      }
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Couldn’t download the update.");
    }
  }, [guard]);

  const restart = useCallback(async () => {
    if (!guard()) return;
    try {
      await Updates.reloadAsync();
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Couldn’t restart the app.");
    }
  }, [guard]);

  return {
    enabled,
    version,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    status,
    message,
    lastChecked,
    check,
    download,
    restart,
  };
}
