/** Theme and navigation preferences. */
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  SettingsPage,
  SettingsScrollView,
  SettingsSectionLabel,
} from "../../../src/components/settings/SettingsPage";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Segmented } from "../../../src/components/ui/Segmented";
import { Toggle } from "../../../src/components/ui/Toggle";
import { useSettingsStore, type NavigationStyle } from "../../../src/store/settings";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing } from "../../../src/theme/tokens";
import type { ThemeMode } from "../../../src/theme/theme";

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const navigationOptions: { value: NavigationStyle; label: string }[] = [
  { value: "docked", label: "Docked" },
  { value: "floating", label: "Floating" },
];

export default function AppearanceScreen() {
  const { palette } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const amoled = useSettingsStore((s) => s.amoled);
  const navigationStyle = useSettingsStore((s) => s.navigationStyle);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setAmoled = useSettingsStore((s) => s.setAmoled);
  const setNavigationStyle = useSettingsStore((s) => s.setNavigationStyle);
  const isDarkActive = palette.mode === "dark";

  return (
    <SettingsPage title="Appearance">
      <SettingsScrollView>
        <SettingsSectionLabel compact>Theme</SettingsSectionLabel>
        <View style={styles.segmentedWrap}>
          <Segmented options={themeOptions} value={themeMode} onChange={setThemeMode} />
        </View>

        <SettingsSectionLabel>Display</SettingsSectionLabel>
        <SettingRow
          icon="contrast-outline"
          label="AMOLED black"
          right={
            <Toggle
              value={amoled && isDarkActive}
              onValueChange={setAmoled}
              disabled={!isDarkActive}
            />
          }
          divider={false}
        />
        {!isDarkActive ? (
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Only applies when dark mode is active.
          </Text>
        ) : null}

        <SettingsSectionLabel>Navigation</SettingsSectionLabel>
        <View style={styles.segmentedWrap}>
          <Segmented
            options={navigationOptions}
            value={navigationStyle}
            onChange={setNavigationStyle}
          />
        </View>
      </SettingsScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  segmentedWrap: { paddingHorizontal: spacing[16], paddingTop: spacing[4] },
  helper: { paddingHorizontal: spacing[20], paddingTop: spacing[8] },
});
