import React, { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { Logo, SPLASH_LOGO_WIDTH } from "./ui/Logo";

const SPLASH_BACKGROUND = {
  light: "#EFE7D2",
  dark: "#1A1A16",
} as const;

/** React fallback matching the native splash for JS reloads and handoff gaps. */
export function LaunchSplash({ onPresented }: { onPresented?: () => void }) {
  const colorScheme = useColorScheme();
  const backgroundColor = SPLASH_BACKGROUND[colorScheme === "dark" ? "dark" : "light"];

  useEffect(() => {
    if (!onPresented) return;
    const frame = requestAnimationFrame(onPresented);
    return () => cancelAnimationFrame(frame);
  }, [onPresented]);

  return (
    <View
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { backgroundColor }]}
    >
      <Logo width={SPLASH_LOGO_WIDTH} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
