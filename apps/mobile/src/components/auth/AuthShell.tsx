/**
 * Shared branded scaffold for auth screens (login/register/verify).
 * Scrollable, safe-area aware, with the Ordo wordmark header and a footer slot.
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
  style?: ViewStyle;
}

export function AuthShell({ title, subtitle, children, footer, style }: AuthShellProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing[40], paddingBottom: insets.bottom + spacing[24] }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: palette.background }}
    >
      <View style={[styles.inner, { maxWidth: layout.maxContentWidth }, style]}>
        <Text variant="wordmark" color="accent" style={styles.wordmark}>Ordo</Text>
        <Text variant="title2" style={{ marginTop: spacing[20] }}>{title}</Text>
        {subtitle ? (
          <Text variant="body" color="secondary" style={{ marginTop: spacing[6] }}>{subtitle}</Text>
        ) : null}

        <View style={{ marginTop: spacing[24] }}>{children}</View>
      </View>
      {footer ? <View style={[styles.footer, { maxWidth: layout.maxContentWidth }]}>{footer}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing[24] },
  inner: { width: "100%", alignSelf: "center" },
  wordmark: {},
  footer: { alignSelf: "center", marginTop: spacing[24] },
});
