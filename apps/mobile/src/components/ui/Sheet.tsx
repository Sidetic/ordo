/**
 * Bottom sheet modal with independently eased panel and scrim motion,
 * dismissable by tap or swipe-down. Stays mounted through the exit animation,
 * then unmounts.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, radius, springs, spacing } from "../../theme/tokens";

const ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);

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
  const { width, height: screenHeight } = useWindowDimensions();
  const panelWidth = Math.min(
    layout.sheetWidth,
    Math.max(0, width - insets.left - insets.right),
  );
  const panelLeft = insets.left + (width - insets.left - insets.right - panelWidth) / 2;
  // Panel translateY. 0 = fully open; screenHeight = fully hidden.
  const ty = useSharedValue(screenHeight);
  const scrim = useSharedValue(0);
  const startTy = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      ty.value = withTiming(0, { duration: 320, easing: ENTER_EASING });
      scrim.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      Keyboard.dismiss();
      scrim.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(screenHeight, { duration: 240, easing: EXIT_EASING }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [mounted, screenHeight, scrim, ty, visible]);

  const dismiss = useCallback(() => onDismiss(), [onDismiss]);
  const finishGestureDismiss = useCallback(() => {
    Keyboard.dismiss();
    setMounted(false);
    dismiss();
  }, [dismiss]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      ty.value = Math.max(0, startTy.value + e.translationY);
    })
    .onEnd((e) => {
      if (ty.value > 100 || e.velocityY > 600) {
        scrim.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(screenHeight, { duration: 220, easing: EXIT_EASING }, (finished) => {
          if (finished) runOnJS(finishGestureDismiss)();
        });
      } else {
        ty.value = withSpring(0, springs.gentle);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrim.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <GestureHandlerRootView
        accessibilityViewIsModal
        style={styles.root}
        pointerEvents={visible ? "auto" : "none"}
      >
        {/*
          Backdrop = animated dim (non-interactive) + a transparent Pressable that
          reliably captures outside taps. Using Pressable (not a raw onTouchEnd on
          the dim) so the tap is captured consistently on web and native and never
          leaks through to the screen behind, which previously left a blank screen.
        */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }, scrimStyle]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[StyleSheet.absoluteFill, styles.frame]}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.panel,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  borderRadius: radius["2xl"],
                  paddingBottom: insets.bottom + spacing[12],
                  width: panelWidth,
                  left: panelLeft,
                  maxHeight: screenHeight * maxFraction,
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
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { alignItems: "center" },
  panel: {
    position: "absolute",
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[8],
    paddingHorizontal: spacing[20],
  },
  grab: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing[12] },
});
