/**
 * ToastHost — renders queued toasts at the bottom with spring enter/exit.
 * Mount once near the app root.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore, type Toast } from "./toast-store";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, springs, spacing } from "../../theme/tokens";

function ToastItem({ toast }: { toast: Toast }) {
  const { palette, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const dismiss = useToastStore((s) => s.dismiss);
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withSequence(
      withSpring(1, springs.gentle),
      withDelay(
        toast.duration,
        withTiming(0, { duration: 240, easing: Easing.inOut(Easing.ease) }, () => dismiss(toast.id)),
      ),
    );
  }, [toast, dismiss, t]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 24 }],
  }));

  const iconName = toast.tone === "success" ? "checkmark-circle" : toast.tone === "danger" ? "alert-circle" : "information-circle";
  const iconColor = toast.tone === "success" ? palette.success : toast.tone === "danger" ? palette.danger : palette.accent;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.border,
          borderRadius: radius.lg,
          marginBottom: insets.bottom + spacing[16],
        },
        shadows.level3,
        animStyle,
      ]}
    >
      <Ionicons name={iconName as any} size={18} color={iconColor} />
      <Text variant="footnote" style={{ flex: 1 }}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    paddingHorizontal: spacing[16],
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
    marginTop: spacing[8],
    borderWidth: StyleSheet.hairlineWidth,
  },
});
