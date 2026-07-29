/**
 * Bottom sheet modal: dim scrim + spring-in panel, dismissable by tap or
 * swipe-down. Renders via React state (not a portal) — place inside the
 * screen that owns it.
 */
import React, { useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, springs, spacing } from "../../theme/tokens";

export interface SheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Max panel height fraction (0–1). */
  maxFraction?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Sheet({ visible, onDismiss, children, maxFraction = 0.8, contentStyle }: SheetProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.value = 0;
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      y.value = withSpring(400, springs.gentle);
    }
  }, [visible, opacity, y]);

  const dismiss = useCallback(() => onDismiss(), [onDismiss]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 600) {
        y.value = withSpring(500, springs.snappy, () => runOnJS(dismiss)());
        opacity.value = withTiming(0, { duration: 160 });
      } else {
        y.value = withSpring(0, springs.gentle);
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    maxHeight: `${Math.round(maxFraction * 100)}%`,
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) {
    return (
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0 }]} />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* Scrim */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }, scrimStyle]}
        onTouchEnd={dismiss}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderRadius: radius.xl,
                paddingBottom: insets.bottom + spacing[12],
              },
              panelStyle,
              contentStyle,
            ]}
          >
            <View style={[styles.grab, { backgroundColor: palette.borderStrong }]} />
            {children}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[8],
    paddingHorizontal: spacing[20],
  },
  grab: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing[12] },
});
