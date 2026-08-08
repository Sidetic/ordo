/**
 * Authenticated app layout — tabbed (Folders · Search · Settings).
 * Detail routes (folder/reader/sessions) are hidden from the tab bar and
 * render full-screen (tab bar hidden) for a focused experience.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { useValidateSession } from "../../src/hooks/queries";
import { useAuthStore } from "../../src/store/auth";
import { useSettingsStore } from "../../src/store/settings";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIDDEN = {
  href: null,
  tabBarStyle: { display: "none" as const },
};

export default function AppLayout() {
  const { palette, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const navigationStyle = useSettingsStore((s) => s.navigationStyle);
  const floating = navigationStyle === "floating";
  // Reconcile local session with the server once authenticated.
  useValidateSession();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarActiveBackgroundColor: floating ? palette.accentSoft : "transparent",
        tabBarStyle: floating
          ? {
              position: "absolute",
              left: spacing[16],
              right: spacing[16],
              bottom: Math.max(insets.bottom, spacing[12]),
              height: layout.tabBarHeight + spacing[8],
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[4],
              backgroundColor: palette.surfaceElevated,
              borderWidth: 1,
              borderColor: palette.borderStrong,
              borderRadius: radius["3xl"],
              ...shadows.level3,
            }
          : {
              backgroundColor: palette.amoled ? palette.background : palette.surface,
              height: layout.tabBarHeight + insets.bottom,
              paddingBottom: insets.bottom,
              borderWidth: 0,
              borderTopWidth: 0,
              shadowOpacity: 0,
              elevation: 0,
            },
        tabBarLabelStyle: {
          fontFamily: "InterTight_500Medium",
          fontSize: floating ? 11 : 10,
          lineHeight: floating ? 15 : 14,
        },
        tabBarItemStyle: floating
          ? { margin: spacing[4], borderRadius: radius.xl, overflow: "hidden" }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Folders",
          tabBarIcon: ({ color }) => <Ionicons name="folder-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
        }}
      />
      {/* Hidden detail routes */}
      <Tabs.Screen name="folder/[id]" options={HIDDEN} />
      <Tabs.Screen name="reader/[id]" options={HIDDEN} />
      <Tabs.Screen name="settings/sessions" options={HIDDEN} />
      <Tabs.Screen name="settings/about" options={HIDDEN} />
      <Tabs.Screen name="settings/account" options={HIDDEN} />
      <Tabs.Screen name="settings/appearance" options={HIDDEN} />
      <Tabs.Screen name="settings/server" options={HIDDEN} />
      <Tabs.Screen name="settings/email" options={HIDDEN} />
      <Tabs.Screen name="settings/verify-email" options={HIDDEN} />
      <Tabs.Screen name="settings/password" options={HIDDEN} />
    </Tabs>
  );
}
