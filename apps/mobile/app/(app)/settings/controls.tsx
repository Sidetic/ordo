/** Preferences for shortcuts and gestures. */
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
import {
  useSettingsStore,
  type CreateButtonAction,
  type CreateButtonHoldAction,
} from "../../../src/store/settings";

const tapOptions: readonly SettingsSelectOption<CreateButtonAction>[] = [
  { value: "menu", label: "Show create menu", shortLabel: "Show menu", icon: "apps-outline" },
  { value: "bookmark", label: "Save bookmark", icon: "bookmark-outline" },
  { value: "folder", label: "Create folder", icon: "folder-outline" },
];

const holdOptions: readonly SettingsSelectOption<CreateButtonHoldAction>[] = [
  ...tapOptions,
  { value: "none", label: "No action", icon: "remove-circle-outline" },
];

export default function ControlsScreen() {
  const tapAction = useSettingsStore((s) => s.createButtonTapAction);
  const holdAction = useSettingsStore((s) => s.createButtonHoldAction);
  const setTapAction = useSettingsStore((s) => s.setCreateButtonTapAction);
  const setHoldAction = useSettingsStore((s) => s.setCreateButtonHoldAction);

  return (
    <SettingsPage title="Controls">
      <SettingsScrollView>
        <SettingsGroup
          label="Bookmarks"
          compact
          footer="These actions apply to the create button on the main Bookmarks page."
        >
          <SettingRow
            icon="hand-left-outline"
            label="Tap"
            description="Choose what happens when you tap the create button."
            right={
              <SettingsSelect
                title="Tap action"
                options={tapOptions}
                value={tapAction}
                onChange={setTapAction}
              />
            }
          />
          <SettingRow
            icon="finger-print-outline"
            label="Press and hold"
            description="Choose a shortcut for pressing and holding the create button."
            right={
              <SettingsSelect
                title="Press and hold action"
                options={holdOptions}
                value={holdAction}
                onChange={setHoldAction}
              />
            }
            divider={false}
          />
        </SettingsGroup>
      </SettingsScrollView>
    </SettingsPage>
  );
}
