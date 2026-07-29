/**
 * Connectivity awareness. A tiny store updated by an expo-network subscription
 * drives the offline banner and gates React Query retries.
 */
import { create } from "zustand";
import * as Network from "expo-network";

interface OnlineState {
  online: boolean;
  init: () => Promise<void>;
}

export const useOnlineStore = create<OnlineState>((set) => ({
  online: true,
  init: async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      set({ online: Boolean(state.isConnected && state.isInternetReachable) });
    } catch {
      set({ online: true });
    }
    Network.addNetworkStateListener((state) => {
      set({ online: Boolean(state.isConnected && state.isInternetReachable) });
    });
  },
}));

export const useOnline = () => useOnlineStore((s) => s.online);
