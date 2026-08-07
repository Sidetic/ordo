import { create } from "zustand";
import * as Updates from "expo-updates";

const SPLASH_PRESENT_TIMEOUT_MS = 1500;

interface UpdateRestartState {
  restarting: boolean;
}

export const useUpdateRestartStore = create<UpdateRestartState>(() => ({
  restarting: false,
}));

let resolveRestartSplash: (() => void) | null = null;

/** Confirm that React committed the fallback before the native runtime reloads. */
export function markRestartSplashPresented(): void {
  const resolve = resolveRestartSplash;
  resolveRestartSplash = null;
  resolve?.();
}

/** Paint the branded fallback before replacing the JS runtime. */
export async function restartRuntime(beforeReload?: () => Promise<void>): Promise<void> {
  if (useUpdateRestartStore.getState().restarting) {
    await beforeReload?.();
    return;
  }

  const splashPresented = new Promise<void>((resolve) => {
    resolveRestartSplash = resolve;
  });
  useUpdateRestartStore.setState({ restarting: true });
  await Promise.race([
    splashPresented,
    new Promise<void>((resolve) => setTimeout(resolve, SPLASH_PRESENT_TIMEOUT_MS)),
  ]);
  resolveRestartSplash = null;

  try {
    await beforeReload?.();
    await Updates.reloadAsync();
  } catch (error) {
    resolveRestartSplash = null;
    useUpdateRestartStore.setState({ restarting: false });
    throw error;
  }
}

export function restartForUpdate(): Promise<void> {
  return restartRuntime();
}
