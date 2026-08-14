/** Account identity and security settings. */
import React from "react";
import { useRouter } from "expo-router";
import {
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { useAuthStore } from "../../../src/store/auth";
import { formatDate } from "../../../src/lib/format";

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <SettingsPage title="Account">
      <SettingsScrollView>
        <SettingsGroup label="Account details" compact>
          <SettingRow
            icon="person-outline"
            label="Username"
            value={user?.username ?? "—"}
            onPress={() => router.push("/settings/username")}
            showChevron
          />
          <SettingRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? "—"}
            onPress={() => router.push("/settings/email")}
            showChevron
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Password"
            value="*****"
            onPress={() => router.push("/settings/password")}
            showChevron
          />
          <SettingRow
            icon="calendar-outline"
            label="Member since"
            value={user ? formatDate(user.createdAt) : "—"}
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Danger zone">
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            description="Permanently delete your account and data"
            destructive
            onPress={() => router.push("/settings/delete-account")}
            showChevron
            divider={false}
          />
        </SettingsGroup>
      </SettingsScrollView>
    </SettingsPage>
  );
}
