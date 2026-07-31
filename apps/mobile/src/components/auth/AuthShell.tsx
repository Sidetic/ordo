/**
 * Shared branded scaffold for auth screens (login/register/verify).
 * Scrollable, safe-area aware, with the content centered (matching the old
 * app's Center + SingleChildScrollView + Column layout) and a footer slot.
 */
import React from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/tokens";

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Pinned to the bottom of the viewport (above the safe-area inset), outside the scroll content. */
  bottomAffix?: React.ReactNode;
  style?: ViewStyle;
}

export function AuthShell({ title, subtitle, children, footer, bottomAffix, style }: AuthShellProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing[24],
            // Extra bottom padding so centered content never sits under the pinned affix.
            paddingBottom: insets.bottom + spacing[24] + spacing[32],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.inner, { maxWidth: layout.maxContentWidth }, style]}>
          <Text variant="header" align="center">{title}</Text>
          {subtitle ? (
            <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[6] }}>{subtitle}</Text>
          ) : null}

          <View style={{ marginTop: spacing[28] }}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>

      {bottomAffix ? (
        <View
          pointerEvents="box-none"
          style={[styles.bottomAffix, { paddingBottom: insets.bottom + spacing[12] }]}
        >
          {bottomAffix}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[24],
  },
  inner: { width: "100%", alignSelf: "center" },
  footer: { marginTop: spacing[24] },
  bottomAffix: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
  },
});
