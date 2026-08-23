/**
 * Authenticated app layout — tabbed (Bookmarks · Search · Settings).
 * Detail routes stay focused on phones and retain the navigation rail when
 * there is enough horizontal room.
 */
import React from "react";
import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, radius, spacing } from "../../src/theme/tokens";
import { useValidateSession } from "../../src/hooks/queries";
import { useFloatingDockMetrics } from "../../src/hooks/use-floating-dock-metrics";
import { useAuthStore } from "../../src/store/auth";
import { useSettingsStore } from "../../src/store/settings";
import { ActivityIndicator, Text as NativeText, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIDDEN = {
  href: null,
};

export default function AppLayout() {
  const { palette, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const showNavigationLabels = useSettingsStore((s) => s.showNavigationLabels);
  const {
    floating,
    compact,
    sideNavigation,
    bottom: floatingBottom,
    height: floatingHeight,
  } = useFloatingDockMetrics();
  const tabBarHeight = showNavigationLabels ? layout.tabBarHeight : layout.touchTargetMin;
  const railWidth = showNavigationLabels
    ? compact
      ? layout.compactNavigationRailWidth
      : layout.navigationRailWidth
    : spacing[56];
  const compactDockWidth = showNavigationLabels
    ? layout.compactFloatingDockWidth
    : layout.compactFloatingDockIconWidth;
  const compactRailHeight = showNavigationLabels
    ? layout.compactNavigationRailHeight
    : layout.compactNavigationRailIconHeight;
  const compactDockLeft = Math.max(0, (windowWidth - compactDockWidth) / 2);
  const compactRailTop = Math.max(0, (windowHeight - compactRailHeight) / 2);
  const railInset = Math.max(insets.left, spacing[8]);
  const tabBarStyle = React.useMemo(
    () => {
      // React Navigation retains one native tab bar while its position changes.
      // Every branch supplies concrete geometry so rail and bottom-dock values
      // cannot leak across an orientation change.
      const reset = {
        borderWidth: 0,
        borderTopWidth: 0,
        borderRadius: 0,
        shadowOpacity: 0,
        elevation: 0,
        zIndex: 0,
      };

      if (sideNavigation) {
        if (!floating) {
          return {
            ...reset,
            position: "relative" as const,
            left: 0,
            right: "auto" as const,
            start: 0,
            end: "auto" as const,
            top: 0,
            bottom: 0,
            width: railWidth + insets.left,
            height: "auto" as const,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: insets.left + spacing[4],
            paddingRight: spacing[4],
            paddingTop: insets.top + spacing[6],
            paddingBottom: insets.bottom + spacing[6],
            backgroundColor: palette.amoled ? palette.background : palette.surface,
          };
        }

        const compactGeometry = compact
          ? {
              top: compactRailTop,
              bottom: "auto" as const,
              height: compactRailHeight,
              marginTop: 0,
              marginBottom: 0,
            }
          : {
              top: Math.max(insets.top, spacing[12]),
              bottom: Math.max(insets.bottom, spacing[12]),
              height: "auto" as const,
              marginTop: 0,
              marginBottom: 0,
            };

        return {
          ...reset,
          ...compactGeometry,
          position: "absolute" as const,
          left: railInset,
          right: "auto" as const,
          start: railInset,
          end: "auto" as const,
          width: railWidth,
          marginLeft: 0,
          marginRight: 0,
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          paddingTop: spacing[4],
          paddingBottom: spacing[4],
          backgroundColor: palette.surfaceElevated,
          borderWidth: 1,
          borderColor: palette.borderStrong,
          borderRadius: radius["3xl"],
          zIndex: 20,
          ...shadows.level3,
        };
      }

      if (!floating) {
        return {
          ...reset,
          position: "relative" as const,
          left: 0,
          right: 0,
          start: 0,
          end: 0,
          top: 0,
          bottom: 0,
          width: "auto" as const,
          height: tabBarHeight + insets.bottom,
          marginLeft: 0,
          marginRight: 0,
          marginTop: 0,
          marginBottom: 0,
          paddingBottom: insets.bottom,
          backgroundColor: palette.amoled ? palette.background : palette.surface,
        };
      }

      return {
        ...reset,
        position: "absolute" as const,
        left: compact ? compactDockLeft : spacing[16],
        right: compact ? "auto" as const : spacing[16],
        start: compact ? compactDockLeft : spacing[16],
        end: compact ? "auto" as const : spacing[16],
        top: "auto" as const,
        bottom: floatingBottom,
        width: compact ? compactDockWidth : "auto" as const,
        height: floatingHeight,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        paddingTop: spacing[4],
        paddingBottom: spacing[4],
        backgroundColor: palette.surfaceElevated,
        borderWidth: 1,
        borderColor: palette.borderStrong,
        borderRadius: radius["3xl"],
        ...shadows.level3,
      };
    },
    [
      floating,
      compact,
      compactDockLeft,
      compactDockWidth,
      compactRailHeight,
      compactRailTop,
      floatingBottom,
      floatingHeight,
      insets.bottom,
      insets.left,
      insets.top,
      palette.amoled,
      palette.background,
      palette.borderStrong,
      palette.surface,
      palette.surfaceElevated,
      railInset,
      railWidth,
      shadows.level3,
      sideNavigation,
      tabBarHeight,
    ],
  );
  const hiddenOptions = React.useMemo(
    () =>
      sideNavigation
        ? { ...HIDDEN, tabBarStyle }
        : { ...HIDDEN, tabBarStyle: { display: "none" as const } },
    [sideNavigation, tabBarStyle],
  );
  const activeSection = pathname.startsWith("/settings")
    ? "settings"
    : pathname.startsWith("/search")
      ? "search"
      : "bookmarks";
  const tabItemStyle = (section: typeof activeSection) => ({
    flex: sideNavigation ? 0 : 1,
    marginHorizontal: floating ? (sideNavigation || compact ? spacing[2] : spacing[4]) : 0,
    marginTop: sideNavigation && section === "bookmarks" ? ("auto" as const) : floating ? spacing[4] : 0,
    marginBottom: sideNavigation && section === "settings" ? ("auto" as const) : floating ? spacing[4] : 0,
    borderRadius: floating ? radius.xl : 0,
    overflow: "hidden" as const,
    backgroundColor:
      floating && activeSection === section ? palette.accentSoft : "transparent",
  });
  const tabColor = (section: typeof activeSection, fallback: string) =>
    activeSection === section ? palette.accent : fallback;
  const tabLabel = (section: typeof activeSection, label: string, fallback: string) => (
    <NativeText
      numberOfLines={1}
      ellipsizeMode="tail"
      style={{
        color: tabColor(section, fallback),
        fontFamily: "InterTight_500Medium",
        fontSize: compact ? 10 : floating ? 11 : 10,
        lineHeight: compact ? 14 : floating ? 15 : 14,
      }}
    >
      {label}
    </NativeText>
  );
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
        tabBarActiveBackgroundColor: "transparent",
        tabBarStyle,
        sceneStyle:
          sideNavigation && floating
            ? { marginStart: railInset + railWidth + spacing[12] }
            : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bookmarks",
          tabBarItemStyle: tabItemStyle("bookmarks"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="bookmark-outline" size={compact ? 20 : 22} color={tabColor("bookmarks", color)} />
          ),
          tabBarLabel: ({ color }) => tabLabel("bookmarks", "Bookmarks", color),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarItemStyle: tabItemStyle("search"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="search-outline" size={compact ? 20 : 22} color={tabColor("search", color)} />
          ),
          tabBarLabel: ({ color }) => tabLabel("search", "Search", color),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarItemStyle: tabItemStyle("settings"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={compact ? 20 : 22} color={tabColor("settings", color)} />
          ),
          tabBarLabel: ({ color }) => tabLabel("settings", "Settings", color),
        }}
      />
      {/* Hidden detail routes */}
      <Tabs.Screen name="folder/[id]" options={hiddenOptions} />
      <Tabs.Screen name="reader/[id]" options={hiddenOptions} />
      <Tabs.Screen name="settings/sessions" options={hiddenOptions} />
      <Tabs.Screen name="settings/about" options={hiddenOptions} />
      <Tabs.Screen name="settings/account" options={hiddenOptions} />
      <Tabs.Screen name="settings/appearance" options={hiddenOptions} />
      <Tabs.Screen name="settings/controls" options={hiddenOptions} />
      <Tabs.Screen name="settings/server" options={hiddenOptions} />
      <Tabs.Screen name="settings/username" options={hiddenOptions} />
      <Tabs.Screen name="settings/email" options={hiddenOptions} />
      <Tabs.Screen name="settings/verify-email" options={hiddenOptions} />
      <Tabs.Screen name="settings/password" options={hiddenOptions} />
      <Tabs.Screen name="settings/delete-account" options={hiddenOptions} />
    </Tabs>
  );
}
