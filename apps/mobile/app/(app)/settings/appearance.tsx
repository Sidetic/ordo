/** Theme and navigation preferences. */
import React from "react";
import {
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import {
  SettingsSelect,
  type SettingsSelectOption,
} from "../../../src/components/settings/SettingsSelect";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Toggle } from "../../../src/components/ui/Toggle";
import { useSettingsStore, type NavigationStyle } from "../../../src/store/settings";
import { useTheme } from "../../../src/theme/ThemeProvider";
import type { ThemeMode } from "../../../src/theme/theme";

const themeOptions: readonly SettingsSelectOption<ThemeMode>[] = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "system", label: "System", icon: "desktop-outline" },
];

const navigationOptions: readonly SettingsSelectOption<NavigationStyle>[] = [
  { value: "docked", label: "Docked", icon: "remove-outline" },
  { value: "floating", label: "Floating dock", shortLabel: "Floating", icon: "tablet-landscape-outline" },
  { value: "compactFloating", label: "Compact floating dock", shortLabel: "Compact", icon: "ellipsis-horizontal-outline" },
];

export default function AppearanceScreen() {
  const { palette } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const amoled = useSettingsStore((s) => s.amoled);
  const navigationStyle = useSettingsStore((s) => s.navigationStyle);
  const showNavigationLabels = useSettingsStore((s) => s.showNavigationLabels);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setAmoled = useSettingsStore((s) => s.setAmoled);
  const setNavigationStyle = useSettingsStore((s) => s.setNavigationStyle);
  const setShowNavigationLabels = useSettingsStore((s) => s.setShowNavigationLabels);
  const isDarkActive = palette.mode === "dark";

  return (
    <SettingsPage title="Appearance">
      <SettingsScrollView>
        <SettingsGroup label="Theme" compact>
          <SettingRow
            icon="color-palette-outline"
            label="Theme"
            right={
              <SettingsSelect
                title="Theme"
                options={themeOptions}
                value={themeMode}
                onChange={setThemeMode}
              />
            }
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Display">
          <SettingRow
            icon="contrast-outline"
            label="AMOLED black"
            description={isDarkActive ? undefined : "Available in dark mode"}
            right={
              <Toggle
                value={amoled && isDarkActive}
                onValueChange={setAmoled}
                disabled={!isDarkActive}
              />
            }
            rightFit="content"
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Navigation">
          <SettingRow
            icon="navigate-outline"
            label="Navigation style"
            right={
              <SettingsSelect
                title="Navigation style"
                options={navigationOptions}
                value={navigationStyle}
                onChange={setNavigationStyle}
              />
            }
          />
          <SettingRow
            icon="list-outline"
            label="Show labels"
            right={<Toggle value={showNavigationLabels} onValueChange={setShowNavigationLabels} />}
            rightFit="content"
            divider={false}
          />
        </SettingsGroup>
      </SettingsScrollView>
    </SettingsPage>
  );
}
