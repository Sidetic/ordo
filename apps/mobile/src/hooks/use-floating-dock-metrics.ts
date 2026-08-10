import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsStore } from "../store/settings";
import { layout, spacing } from "../theme/tokens";
import { useResponsiveLayout } from "./use-responsive-layout";

const FLOATING_DOCK_PATHS = new Set(["/", "/search", "/settings"]);

export function useFloatingDockMetrics() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { useSideNavigation } = useResponsiveLayout();
  const floating = useSettingsStore((s) => s.navigationStyle === "floating");
  const showLabels = useSettingsStore((s) => s.showNavigationLabels);
  const bottom = Math.max(insets.bottom, spacing[12]);
  const height = (showLabels ? layout.tabBarHeight : layout.touchTargetMin) + spacing[8];
  const clearance = bottom + height + spacing[16];
  const navigationVisible = FLOATING_DOCK_PATHS.has(pathname);
  const dockedClearance =
    (showLabels ? layout.tabBarHeight : layout.touchTargetMin) + insets.bottom + spacing[16];

  return {
    floating,
    sideNavigation: useSideNavigation,
    visible: floating && !useSideNavigation && navigationVisible,
    bottom,
    height,
    clearance,
    overlayClearance: navigationVisible && !useSideNavigation
      ? floating
        ? clearance
        : dockedClearance
      : insets.bottom + spacing[16],
  };
}
