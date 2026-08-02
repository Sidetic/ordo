/**
 * Settings: server, account, appearance (theme + AMOLED), registration status,
 * devices, and sign out.
 */
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../../src/components/ui/Header";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Button } from "../../../src/components/ui/Button";
import { Segmented } from "../../../src/components/ui/Segmented";
import { Toggle } from "../../../src/components/ui/Toggle";
import { ServerConnectSheet } from "../../../src/components/auth/ServerConnectSheet";
import { useAuthStore } from "../../../src/store/auth";
import { useSettingsStore } from "../../../src/store/settings";
import { useServerInfo } from "../../../src/hooks/queries";
import { useLogout } from "../../../src/hooks/use-auth-actions";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { formatDate } from "../../../src/lib/format";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";
import type { ThemeMode } from "../../../src/theme/theme";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" color="secondary" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </Text>
  );
}

export default function SettingsScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { serverUrl, themeMode, amoled, setThemeMode, setAmoled } = useSettingsStore();
  const { data: info } = useServerInfo();
  const logout = useLogout();

  const [serverOpen, setServerOpen] = useState(false);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "Auto" },
  ];

  const isDarkActive = themeMode === "dark";

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Settings" large />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[40] }} showsVerticalScrollIndicator={false}>
        {/* Server */}
        <SectionLabel>Server</SectionLabel>
        <SettingRow
          icon="server-outline"
          label="Server"
          value={serverUrl.replace(/^https?:\/\//, "")}
          onPress={() => setServerOpen(true)}
          showChevron
        />
        <SettingRow
          icon={info?.registrationEnabled ? "person-add-outline" : "lock-closed-outline"}
          label="Sign-ups"
          value={info ? (info.registrationEnabled ? "Open" : "Closed") : "—"}
        />

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <SettingRow
          icon="at-outline"
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
          onPress={() => router.push("/settings/password")}
          showChevron
        />
        <SettingRow
          icon="calendar-outline"
          label="Member since"
          value={user ? formatDate(user.createdAt) : "—"}
          divider={false}
        />

        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <View style={styles.themeWrap}>
          <Text variant="body" style={{ marginBottom: spacing[8] }}>Theme</Text>
          <Segmented options={themeOptions} value={themeMode} onChange={setThemeMode} />
        </View>
        <SettingRow
          icon="contrast-outline"
          label="AMOLED black"
          right={<Toggle value={amoled && isDarkActive} onValueChange={(v) => setAmoled(v)} disabled={!isDarkActive} />}
          divider={false}
        />
        {!isDarkActive ? (
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Only applies when dark mode is active.
          </Text>
        ) : null}

        {/* Devices */}
        <SectionLabel>Devices</SectionLabel>
        <SettingRow
          icon="phone-portrait-outline"
          label="Active sessions"
          onPress={() => router.push("/settings/sessions")}
          showChevron
          divider={false}
        />

        {/* About */}
        <SectionLabel>About</SectionLabel>
        <SettingRow
          icon="information-circle-outline"
          label="About Ordo"
          onPress={() => router.push("/settings/about")}
          showChevron
          divider={false}
        />

        {/* Sign out */}
        <View style={styles.signout}>
          <Button
            label="Sign out"
            variant="danger"
            block
            size="lg"
            loading={logout.isPending}
            onPress={() => {
              haptics.medium();
              logout.mutate();
            }}
          />
        </View>
      </ScrollView>

      <ServerConnectSheet visible={serverOpen} onDismiss={() => setServerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { paddingHorizontal: spacing[20], paddingTop: spacing[24], paddingBottom: spacing[8] },
  themeWrap: { paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  helper: { paddingHorizontal: spacing[20], paddingTop: spacing[8] },
  signout: { paddingHorizontal: spacing[16], paddingTop: spacing[32] },
});
