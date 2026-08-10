import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useColorScheme } from "react-native";
import { Logo, SPLASH_LOGO_WIDTH } from "./ui/Logo";

const SPLASH_BACKGROUND = {
  light: "#EFE7D2",
  dark: "#1A1A16",
} as const;

interface LaunchSplashProps {
  transitionIn?: boolean;
  onPresented?: () => void;
}

/** React fallback matching the native splash for JS reloads and handoff gaps. */
export function LaunchSplash({ transitionIn = false, onPresented }: LaunchSplashProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = SPLASH_BACKGROUND[colorScheme === "dark" ? "dark" : "light"];
  const progress = useRef(new Animated.Value(transitionIn ? 0 : 1)).current;

  useEffect(() => {
    if (!onPresented) return;
    if (!transitionIn) {
      const frame = requestAnimationFrame(onPresented);
      return () => cancelAnimationFrame(frame);
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onPresented();
    });
    return () => animation.stop();
  }, [onPresented, progress, transitionIn]);

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { backgroundColor, opacity: progress }]}
    >
      <Animated.View
        style={{
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        }}
      >
        <Logo width={SPLASH_LOGO_WIDTH} />
      </Animated.View>
    </Animated.View>
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
