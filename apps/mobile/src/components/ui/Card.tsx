/**
 * Surface card with subtle border + optional elevation.
 */
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, type Radius } from "../../theme/tokens";

export interface CardProps extends ViewProps {
  pad?: keyof typeof spacing;
  radiusKey?: Radius;
  elevated?: boolean;
}

export function Card({ pad = 16, radiusKey = "lg", elevated, style, children, ...rest }: CardProps) {
  const { palette, shadows } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: radius[radiusKey],
          padding: spacing[pad],
          ...(elevated ? shadows.level2 : {}),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
