import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Button } from "../../../src/components/ui/Button";
import { Input } from "../../../src/components/ui/Input";
import { Text } from "../../../src/components/ui/Text";
import {
  BackupCodesList,
  MfaSetupPanel,
} from "../../../src/components/auth/MfaSetupPanel";
import { toast } from "../../../src/components/ui/toast-store";
import { useAuthStore } from "../../../src/store/auth";
import { authApi } from "../../../src/lib/api/auth";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function SecurityScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const disable = async () => {
    setError("");
    setBusy(true);
    try {
      const updated = await authApi.totpDisable({ mfaCode });
      setUser(updated);
      setMfaCode("");
      setBackupCodes(null);
      haptics.success();
      toast.success("Authenticator turned off");
    } catch (e) {
      haptics.error();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await authApi.regenerateBackupCodes({ mfaCode });
      setBackupCodes(result.backupCodes);
      setMfaCode("");
      haptics.success();
      toast.success("New backup codes created");
    } catch (e) {
      haptics.error();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage title="Security">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled">
          <SettingsGroup
            label="Authenticator app"
            compact
            footer="A second step after your password. Keep backup codes somewhere safe — each one works once."
          >
            {user?.mfaEnabled ? (
              <SettingsForm style={styles.form}>
                <SettingRow
                  icon="shield-checkmark-outline"
                  label="Authenticator"
                  value="On"
                  divider={false}
                />
                {backupCodes ? (
                  <>
                    <Text variant="footnote" color="secondary">
                      Save these codes now. They will not be shown again.
                    </Text>
                    <BackupCodesList codes={backupCodes} />
                  </>
                ) : null}
                <Input
                  label="Current authenticator or backup code"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  placeholder="123456 or xxxx-xxxx"
                  autoCapitalize="none"
                  error={error || undefined}
                />
                <Button
                  label="Generate new backup codes"
                  variant="secondary"
                  block
                  loading={busy}
                  onPress={regenerate}
                />
                <Button
                  label="Turn off authenticator"
                  variant="danger"
                  block
                  loading={busy}
                  onPress={disable}
                />
              </SettingsForm>
            ) : (
              <SettingsForm style={styles.form}>
                {backupCodes ? (
                  <View style={{ gap: spacing[12] }}>
                    <Text variant="body">Save these backup codes now. They will not be shown again.</Text>
                    <BackupCodesList codes={backupCodes} />
                    <Button label="I've saved these codes" onPress={() => setBackupCodes(null)} />
                  </View>
                ) : (
                  <MfaSetupPanel
                    onEnabled={(updated, codes) => {
                      setUser(updated);
                      setBackupCodes(codes);
                    }}
                  />
                )}
              </SettingsForm>
            )}
          </SettingsGroup>
        </SettingsScrollView>
      </KeyboardAvoidingView>
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
};
