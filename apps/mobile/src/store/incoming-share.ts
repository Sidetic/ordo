import { create } from "zustand";

interface IncomingShareState {
  pendingUrl: string | null;
  setPendingUrl: (url: string) => void;
  clear: () => void;
}

export const useIncomingShareStore = create<IncomingShareState>((set) => ({
  pendingUrl: null,
  setPendingUrl: (pendingUrl) => set({ pendingUrl }),
  clear: () => set({ pendingUrl: null }),
}));
