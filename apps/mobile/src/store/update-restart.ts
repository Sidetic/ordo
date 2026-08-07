import { create } from "zustand";
import * as Updates from "expo-updates";

interface UpdateRestartState {
  restarting: boolean;
}

export const useUpdateRestartStore = create<UpdateRestartState>(() => ({
  restarting: false,
}));

/** Paint the branded fallback before expo-updates replaces the JS runtime. */
export async function restartForUpdate(): Promise<void> {
  if (useUpdateRestartStore.getState().restarting) return;
  useUpdateRestartStore.setState({ restarting: true });

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    await Updates.reloadAsync();
  } catch (error) {
    useUpdateRestartStore.setState({ restarting: false });
    throw error;
  }
}
