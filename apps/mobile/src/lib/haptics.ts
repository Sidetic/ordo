/**
 * Thin haptic helpers. Wrapped so they never throw (expo-haptics is unavailable
 * on web and throws synchronously) and can be toggled later.
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let enabled = true;
export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

/** Run a haptic only where supported; swallow any rejection/throw. */
function run(fn: () => Promise<void> | void) {
  if (!enabled || Platform.OS === "web") return;
  try {
    void Promise.resolve(fn()).catch(() => {});
  } catch {
    /* ignore */
  }
}

export const haptics = {
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  soft: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  selection: () => run(Haptics.selectionAsync),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
