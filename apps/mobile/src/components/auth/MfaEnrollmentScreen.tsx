import React, { useState } from "react";
import { View } from "react-native";
import type { UserDto } from "@ordo/shared";
import { Header } from "../ui/Header";
import { Text } from "../ui/Text";
import { BackupCodesList, MfaSetupPanel } from "./MfaSetupPanel";
import { Button } from "../ui/Button";
import { SettingsScrollView } from "../settings/SettingsPage";
import { useAuthStore } from "../../store/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/tokens";

/** Shown instead of the app when the server requires MFA and this account has none. */
export function MfaEnrollmentScreen() {
  const { palette } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const [pending, setPending] = useState<{ user: UserDto; codes: string[] } | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Protect your account" large maxWidth={layout.maxSettingsWidth} />
      <SettingsScrollView>
        <View style={{ gap: spacing[16], paddingVertical: spacing[8] }}>
          <Text variant="body" color="secondary">
            This server requires an authenticator app before you can continue.
          </Text>
          {pending ? (
            <>
              <Text variant="body">Save these backup codes. They will not be shown again.</Text>
              <BackupCodesList codes={pending.codes} />
              <Button
                label="Continue"
                block
                size="lg"
                onPress={() => setUser(pending.user)}
              />
            </>
          ) : (
            <MfaSetupPanel onEnabled={(user, backupCodes) => setPending({ user, codes: backupCodes })} />
          )}
        </View>
      </SettingsScrollView>
    </View>
  );
}
