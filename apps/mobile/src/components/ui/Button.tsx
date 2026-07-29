/**
 * Button — spring press feedback, four variants, loading + icon support.
 */
import React from "react";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** Stretch to fill width. */
  block?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  block = false,
  style,
  testID,
}: ButtonProps) {
  const { palette } = useTheme();

  const bg = {
    primary: palette.accent,
    secondary: palette.surfaceSecondary,
    ghost: "transparent",
    danger: palette.danger,
  }[variant];

  const fg = {
    primary: palette.onAccent,
    secondary: palette.text,
    ghost: palette.text,
    danger: "#FFFFFF",
  }[variant];

  const isDisabled = disabled || loading;
  const height = size === "lg" ? 52 : 44;

  return (
    <PressableScale
      testID={testID}
      disabled={isDisabled}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={[
        styles.base,
        {
          height,
          backgroundColor: bg,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : 1,
          ...(block ? { flex: 1 } : {}),
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text variant="bodyStrong" color={variant === "ghost" ? "primary" : undefined} style={{ color: fg }}>
              {label}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing[20],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  iconWrap: { marginRight: spacing[8] },
});
