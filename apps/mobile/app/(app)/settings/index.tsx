/** Settings hub: focused destinations for account and app preferences. */
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../../src/components/ui/Header";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { SettingsGroup, SettingsScrollView } from "../../../src/components/settings/SettingsPage";
import { useAuthStore } from "../../../src/store/auth";
import { useSettingsStore } from "../../../src/store/settings";
import { useLogout } from "../../../src/hooks/use-auth-actions";
import { useFloatingDockMetrics } from "../../../src/hooks/use-floating-dock-metrics";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { hostOf } from "../../../src/lib/server-probe";
import { layout, radius, spacing } from "../../../src/theme/tokens";

export default function SettingsScreen() {
  const { palette, shadows } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const { visible: floatingNavigation, clearance: floatingBottomClearance } =
    useFloatingDockMetrics();
  const logout = useLogout();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Settings" large maxWidth={layout.maxSettingsWidth} />
      <SettingsScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: floatingNavigation ? floatingBottomClearance : spacing[40] },
        ]}
      >
        <SettingsGroup label="Preferences" compact>
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
            description="Theme, display, and navigation"
            onPress={() => router.push("/settings/appearance")}
            showChevron
          />
          <SettingRow
            icon="phone-portrait-outline"
            label="Active sessions"
            description="Review devices signed in to your account"
            onPress={() => router.push("/settings/sessions")}
            showChevron
          />
          <SettingRow
            icon="server-outline"
            label="Server"
            description="Connection and self-hosting"
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
        </SettingsGroup>

        <SettingsGroup label="Account">
          <View style={styles.signout}>
            <Button
              label="Sign out"
              variant="danger"
              block
              size="lg"
              loading={logout.isPending}
              onPress={() => setConfirmingLogout(true)}
            />
          </View>
        </SettingsGroup>
      </SettingsScrollView>

      <Modal
        visible={confirmingLogout}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={logout.isPending ? () => {} : () => setConfirmingLogout(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]}
            disabled={logout.isPending}
            onPress={() => setConfirmingLogout(false)}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                ...shadows.level3,
              },
            ]}
          >
            <View style={styles.confirmContent}>
              <View style={[styles.confirmIcon, { backgroundColor: palette.dangerSoft }]}>
                <Ionicons name="log-out-outline" size={22} color={palette.danger} />
              </View>
              <Text variant="title1" align="center">
                Sign out?
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
                You'll need to sign in again to access your saves.
              </Text>
            </View>
            <View style={styles.actions}>
              <Button
                label="Sign out"
                variant="primary"
                size="lg"
                loading={logout.isPending}
                onPress={() => logout.mutate()}
                style={styles.action}
              />
              <Button
                label="Cancel"
                variant="ghost"
                disabled={logout.isPending}
                onPress={() => setConfirmingLogout(false)}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[4] },
  signout: { padding: spacing[16] },
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[20],
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius["3xl"],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    paddingBottom: spacing[16],
  },
  confirmContent: { alignItems: "center" },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: radius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[16],
  },
  confirmCopy: { marginTop: spacing[8], maxWidth: 250 },
  actions: { gap: spacing[4], marginTop: spacing[24] },
  action: { width: "100%" },
});
