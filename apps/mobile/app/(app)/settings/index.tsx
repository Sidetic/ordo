/** Settings hub: focused destinations for account and app preferences. */
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../../src/components/ui/Header";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { useAuthStore } from "../../../src/store/auth";
import { useSettingsStore } from "../../../src/store/settings";
import { useLogout } from "../../../src/hooks/use-auth-actions";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { hostOf } from "../../../src/lib/server-probe";
import { haptics } from "../../../src/lib/haptics";
import { radius, spacing } from "../../../src/theme/tokens";

export default function SettingsScreen() {
  const { palette, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const navigationStyle = useSettingsStore((s) => s.navigationStyle);
  const showNavigationLabels = useSettingsStore((s) => s.showNavigationLabels);
  const logout = useLogout();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const floatingBottomClearance =
    (showNavigationLabels ? spacing[96] : spacing[80]) + Math.max(insets.bottom - spacing[12], 0);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Settings" large />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: navigationStyle === "floating" ? floatingBottomClearance : spacing[40] },
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
            onPress={() => setConfirmingLogout(true)}
          />
        </View>
      </ScrollView>

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
                backgroundColor: palette.surface,
                borderColor: palette.borderStrong,
                ...shadows.level3,
              },
            ]}
          >
            <View style={styles.confirmHeader}>
              <View style={[styles.confirmIcon, { backgroundColor: palette.dangerSoft }]}>
                <Ionicons name="log-out-outline" size={20} color={palette.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title2">Sign out?</Text>
                <Text variant="footnote" color="secondary" style={styles.confirmCopy}>
                  You will need to sign in again to access your saves.
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                disabled={logout.isPending}
                onPress={() => setConfirmingLogout(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Sign out"
                variant="danger"
                loading={logout.isPending}
                onPress={() => {
                  haptics.medium();
                  logout.mutate();
                }}
                style={{ flex: 1 }}
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
  destinations: { paddingTop: spacing[2] },
  signout: { paddingHorizontal: spacing[16], paddingTop: spacing[32] },
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[20],
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius["2xl"],
    padding: spacing[20],
  },
  confirmHeader: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  confirmIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCopy: { marginTop: spacing[2] },
  actions: { flexDirection: "row", gap: spacing[10], marginTop: spacing[20] },
});
