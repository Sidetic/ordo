import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../ui/Header";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/tokens";

interface SettingsPageProps {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function SettingsPage({ title, children, right }: SettingsPageProps) {
  const { palette } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.page, { backgroundColor: palette.background }]}>
      <Header
        title={title}
        showBack
        right={right}
        maxWidth={layout.maxSettingsWidth}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
      />
      {children}
    </View>
  );
}

export function SettingsScrollView({
  children,
  contentContainerStyle,
  contentWidth = layout.maxSettingsWidth,
  ...props
}: ScrollViewProps & { contentWidth?: number }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingLeft: insets.left, paddingRight: insets.right },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      <View style={[styles.contentColumn, { maxWidth: contentWidth }]}>{children}</View>
    </ScrollView>
  );
}

export function SettingsContent({
  children,
  maxWidth = layout.maxSettingsWidth,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.contentFrame, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.contentColumn, { maxWidth }, style]}>{children}</View>
    </View>
  );
}

export function SettingsForm({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.formColumn, style]}>{children}</View>;
}

export function SettingsSectionLabel({
  children,
  compact,
}: {
  children: string;
  compact?: boolean;
}) {
  return (
    <Text
      variant="caption"
      color="secondary"
      style={[styles.sectionLabel, compact && styles.compactSectionLabel]}
    >
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { paddingBottom: spacing[40] },
  contentFrame: { width: "100%" },
  contentColumn: { width: "100%", alignSelf: "center" },
  formColumn: { width: "100%", maxWidth: layout.maxFormWidth, alignSelf: "center" },
  sectionLabel: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
  },
  compactSectionLabel: { paddingTop: spacing[8] },
});
