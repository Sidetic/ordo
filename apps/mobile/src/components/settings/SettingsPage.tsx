import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../ui/Header";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";

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
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
      />
      {children}
    </View>
  );
}

export function SettingsScrollView({ contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
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
  sectionLabel: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
  },
  compactSectionLabel: { paddingTop: spacing[8] },
});
