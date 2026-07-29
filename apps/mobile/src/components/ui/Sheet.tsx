/**
 * Bottom sheet modal: dim scrim + spring-in panel, dismissable by tap or
 * swipe-down. Driven by a single `translateY` shared value so the enter/exit
 * animation is always correct (no off-screen-first-paint races). Stays mounted
 * through the exit animation, then unmounts.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Easing as RNEasing,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, springs, spacing } from "../../theme/tokens";

const SCREEN_H = Dimensions.get("window").height;

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
  // Panel translateY. 0 = fully open; SCREEN_H = fully hidden (off-screen).
  const ty = useSharedValue(SCREEN_H);
  const startTy = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      ty.value = withSpring(0, springs.gentle);
    } else if (mounted) {
      ty.value = withTiming(SCREEN_H, { duration: 200, easing: RNEasing.inOut(RNEasing.ease) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const dismiss = useCallback(() => onDismiss(), [onDismiss]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      ty.value = Math.max(0, startTy.value + e.translationY);
    })
    .onEnd((e) => {
      if (ty.value > 100 || e.velocityY > 600) {
        ty.value = withSpring(SCREEN_H, springs.snappy, () => runOnJS(dismiss)());
      } else {
        ty.value = withSpring(0, springs.gentle);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [0, SCREEN_H], [1, 0], Extrapolation.CLAMP),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  if (!mounted) return null;

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
                maxHeight: `${Math.round(maxFraction * 100)}%`,
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
