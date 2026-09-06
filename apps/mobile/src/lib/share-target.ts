import { BackHandler, Platform, ToastAndroid } from "react-native";

/**
 * Put the sender app back in front after an Android share-target save or cancel.
 *
 * Deferred one tick so a still-visible RN Modal does not consume the default
 * back handler (which would only close the sheet and leave Ordo on screen).
 */
export function returnToShareSender(message?: string): void {
  if (Platform.OS !== "android") return;
  if (message) ToastAndroid.show(message, ToastAndroid.SHORT);
  setTimeout(() => BackHandler.exitApp(), 0);
}
