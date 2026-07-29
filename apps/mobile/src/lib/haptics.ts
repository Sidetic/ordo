/**
 * Thin haptic helpers. Wrapped so they never throw and can be toggled later.
 */
import * as Haptics from "expo-haptics";

let enabled = true;
export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export const haptics = {
  light: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  soft: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  selection: () => enabled && void Haptics.selectionAsync(),
  success: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
