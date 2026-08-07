/** Settings hub: focused destinations for account and app preferences. */
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../../src/components/ui/Header";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Button } from "../../../src/components/ui/Button";
import { useAuthStore } from "../../../src/store/auth";
import { useSettingsStore } from "../../../src/store/settings";
import { useLogout } from "../../../src/hooks/use-auth-actions";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { hostOf } from "../../../src/lib/server-probe";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function SettingsScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const navigationStyle = useSettingsStore((s) => s.navigationStyle);
  const logout = useLogout();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Settings" large />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: navigationStyle === "floating" ? spacing[96] : spacing[40] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.destinations}>
          <SettingRow
            icon="person-circle-outline"
            label="Account"
            value={user?.username ?? "—"}
            onPress={() => router.push("/settings/account")}
            showChevron
          />
          <SettingRow
            icon="color-palette-outline"
            label="Appearance"
            onPress={() => router.push("/settings/appearance")}
            showChevron
          />
          <SettingRow
            icon="phone-portrait-outline"
            label="Active sessions"
            onPress={() => router.push("/settings/sessions")}
            showChevron
          />
          <SettingRow
            icon="server-outline"
            label="Server"
            value={hostOf(serverUrl)}
            onPress={() => router.push("/settings/server")}
            showChevron
          />
          <SettingRow
            icon="information-circle-outline"
            label="About"
            onPress={() => router.push("/settings/about")}
            showChevron
            divider={false}
          />
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[12] },
  destinations: { paddingTop: spacing[4] },
  signout: { paddingHorizontal: spacing[16], paddingTop: spacing[32] },
});
