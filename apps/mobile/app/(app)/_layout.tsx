/**
 * Authenticated app layout — tabbed (Folders · Search · Settings).
 * Detail routes stay focused on phones and retain the navigation rail when
 * there is enough horizontal room.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { useValidateSession } from "../../src/hooks/queries";
import { useFloatingDockMetrics } from "../../src/hooks/use-floating-dock-metrics";
import { useAuthStore } from "../../src/store/auth";
import { useSettingsStore } from "../../src/store/settings";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIDDEN = {
  href: null,
};

export default function AppLayout() {
  const { palette, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const showNavigationLabels = useSettingsStore((s) => s.showNavigationLabels);
  const {
    floating,
    sideNavigation,
    bottom: floatingBottom,
    height: floatingHeight,
  } = useFloatingDockMetrics();
  const tabBarHeight = showNavigationLabels ? layout.tabBarHeight : layout.touchTargetMin;
  const railWidth = showNavigationLabels ? layout.navigationRailWidth : spacing[56];
  const railInset = Math.max(insets.left, spacing[12]);
  const tabBarStyle = sideNavigation
    ? floating
      ? {
          position: "absolute" as const,
          start: railInset,
          top: Math.max(insets.top, spacing[12]),
          bottom: Math.max(insets.bottom, spacing[12]),
          width: railWidth,
          paddingStart: spacing[4],
          paddingEnd: spacing[4],
          paddingTop: spacing[4],
          paddingBottom: spacing[4],
          backgroundColor: palette.surfaceElevated,
          borderWidth: 1,
          borderColor: palette.borderStrong,
          borderRadius: radius["3xl"],
          ...shadows.level3,
        }
      : {
          width: railWidth + insets.left,
          paddingStart: insets.left + spacing[12],
          paddingEnd: spacing[12],
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[6],
          backgroundColor: palette.amoled ? palette.background : palette.surface,
          borderWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        }
    : floating
      ? {
          position: "absolute" as const,
          start: spacing[16],
          end: spacing[16],
          bottom: floatingBottom,
          height: floatingHeight,
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
          height: tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          borderWidth: 0,
          borderTopWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        };
  const hiddenOptions = sideNavigation
    ? { ...HIDDEN, tabBarStyle }
    : { ...HIDDEN, tabBarStyle: { display: "none" as const } };
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
        tabBarPosition: sideNavigation ? "left" : "bottom",
        tabBarVariant: sideNavigation ? "material" : "uikit",
        tabBarLabelPosition: "below-icon",
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarShowLabel: showNavigationLabels,
        tabBarActiveBackgroundColor: floating ? palette.accentSoft : "transparent",
        tabBarStyle,
        sceneStyle:
          sideNavigation && floating
            ? { marginStart: railInset + railWidth + spacing[12] }
            : undefined,
        tabBarLabelStyle: {
          fontFamily: "InterTight_500Medium",
          fontSize: floating ? 11 : 10,
          lineHeight: floating ? 15 : 14,
        },
        // React Navigation leaves an icon-only item slightly above center.
        tabBarIconStyle:
          !sideNavigation && !showNavigationLabels
            ? { transform: [{ translateY: spacing[2] }] }
            : undefined,
        tabBarItemStyle: floating
          ? {
              marginHorizontal: sideNavigation ? spacing[6] : spacing[4],
              marginVertical: spacing[4],
              borderRadius: radius.xl,
              overflow: "hidden",
            }
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
      <Tabs.Screen name="folder/[id]" options={hiddenOptions} />
      <Tabs.Screen name="reader/[id]" options={hiddenOptions} />
      <Tabs.Screen name="settings/sessions" options={hiddenOptions} />
      <Tabs.Screen name="settings/about" options={hiddenOptions} />
      <Tabs.Screen name="settings/account" options={hiddenOptions} />
      <Tabs.Screen name="settings/appearance" options={hiddenOptions} />
      <Tabs.Screen name="settings/server" options={hiddenOptions} />
      <Tabs.Screen name="settings/email" options={hiddenOptions} />
      <Tabs.Screen name="settings/verify-email" options={hiddenOptions} />
      <Tabs.Screen name="settings/password" options={hiddenOptions} />
    </Tabs>
  );
}
