/**
 * Authenticated app layout — tabbed (Folders · Search · Settings).
 * Detail routes (folder/reader/sessions) are hidden from the tab bar and
 * render full-screen (tab bar hidden) for a focused experience.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/tokens";
import { useValidateSession } from "../../src/hooks/queries";
import { useAuthStore } from "../../src/store/auth";
import { ActivityIndicator, View } from "react-native";

const HIDDEN = {
  href: null,
  tabBarStyle: { display: "none" as const },
};

export default function AppLayout() {
  const { palette } = useTheme();
  const status = useAuthStore((s) => s.status);
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
        tabBarStyle: {
          backgroundColor: palette.background,
          height: layout.tabBarHeight,
        },
        tabBarLabelStyle: { fontFamily: "InterTight_500Medium", fontSize: 10 },
        tabBarItemStyle: { paddingVertical: 8 },
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
      <Tabs.Screen name="settings/username" options={HIDDEN} />
      <Tabs.Screen name="settings/email" options={HIDDEN} />
      <Tabs.Screen name="settings/verify-email" options={HIDDEN} />
      <Tabs.Screen name="settings/password" options={HIDDEN} />
    </Tabs>
  );
}
