/**
 * Lightweight toast store + hook. Toasts auto-dismiss and queue.
 */
import { create } from "zustand";

export type ToastTone = "default" | "success" | "danger";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { tone?: ToastTone; duration?: number }) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, opts) => {
    const id = `t${++counter}`;
    const toast: Toast = {
      id,
      message,
      tone: opts?.tone ?? "default",
      duration: opts?.duration ?? 3200,
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  show: (message: string, opts?: { tone?: ToastTone; duration?: number }) =>
    useToastStore.getState().show(message, opts),
  success: (message: string) => useToastStore.getState().show(message, { tone: "success" }),
  error: (message: string) => useToastStore.getState().show(message, { tone: "danger" }),
};
