import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing } from "../../theme/tokens";

interface ScreenContentProps {
  children: React.ReactNode;
  maxWidth?: number;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A centered content column that also protects landscape display cutouts. */
export function ScreenContent({
  children,
  maxWidth = layout.maxContentWidth,
  padded = true,
  style,
}: ScreenContentProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.content,
        {
          maxWidth,
          paddingLeft: padded ? Math.max(insets.left, spacing[16]) : insets.left,
          paddingRight: padded ? Math.max(insets.right, spacing[16]) : insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", alignSelf: "center" },
});
