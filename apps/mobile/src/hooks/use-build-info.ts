/**
 * Build-time facts baked into the artifact: app version + the git commit this
 * bundle/binary was produced from (injected at config-eval time — see
 * app.config.js). Runtime/OTA state (embedded vs OTA, fingerprint, channel,
 * update status) lives in useOtaUpdate().
 */
import Constants from "expo-constants";

export interface BuildInfo {
  version: string;
  gitHash: string | null;
  gitHashShort: string | null;
  gitDirty: boolean;
}

interface OrdoExtra {
  gitHash?: string | null;
  gitHashShort?: string | null;
  gitDirty?: boolean;
}

export function useBuildInfo(): BuildInfo {
  const extra = (Constants.expoConfig?.extra as { ordo?: OrdoExtra } | undefined)?.ordo;
  return {
    version: Constants.expoConfig?.version ?? "—",
    gitHash: extra?.gitHash ?? null,
    gitHashShort: extra?.gitHashShort ?? null,
    gitDirty: extra?.gitDirty ?? false,
  };
}
