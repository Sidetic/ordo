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
import { BackupCodesDialog } from "../../../src/components/auth/BackupCodesDialog";
import { MfaSetupPanel } from "../../../src/components/auth/MfaSetupPanel";
import { FloatingPanel } from "../../../src/components/ui/FloatingPanel";
import { toast } from "../../../src/components/ui/toast-store";
import { useAuthStore } from "../../../src/store/auth";
import { authApi } from "../../../src/lib/api/auth";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

type StepUp = "regenerate" | "disable" | null;

export default function SecurityScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [stepUp, setStepUp] = useState<StepUp>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closeStepUp = () => {
    if (busy) return;
    setStepUp(null);
    setMfaCode("");
    setError("");
  };

  const submitStepUp = async () => {
    if (!stepUp || busy) return;
    setError("");
    const code = mfaCode.trim();
    if (!code) {
      setError("Enter your authenticator or backup code.");
      return;
    }
    setBusy(true);
    try {
      if (stepUp === "disable") {
        const updated = await authApi.totpDisable({ mfaCode: code });
        setUser(updated);
        haptics.success();
        toast.success("Authenticator turned off");
        setStepUp(null);
        setMfaCode("");
        setError("");
      } else {
        const result = await authApi.regenerateBackupCodes({ mfaCode: code });
        haptics.success();
        setStepUp(null);
        setMfaCode("");
        setError("");
        requestAnimationFrame(() => setBackupCodes(result.backupCodes));
      }
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
          {user?.mfaEnabled ? (
            <>
              <SettingsGroup
                label="Authenticator"
                compact
                footer="A second step after your password. Backup codes are shown only when you create them."
              >
                <SettingRow
                  icon="shield-checkmark-outline"
                  label="Status"
                  value="On"
                />
                <SettingRow
                  icon="key-outline"
                  label="New backup codes"
                  description="Previous codes will stop working"
                  onPress={() => setStepUp("regenerate")}
                  showChevron
                  divider={false}
                />
              </SettingsGroup>
              <SettingsGroup label="Danger zone">
                <SettingRow
                  icon="close-circle-outline"
                  label="Turn off authenticator"
                  destructive
                  onPress={() => setStepUp("disable")}
                  showChevron
                  divider={false}
                />
              </SettingsGroup>
            </>
          ) : (
            <SettingsGroup
              label="Authenticator app"
              compact
              footer="Use an authenticator app as a second step after your password."
            >
              <SettingsForm style={styles.form}>
                <MfaSetupPanel
                  onEnabled={(updated, codes) => {
                    setUser(updated);
                    setBackupCodes(codes);
                  }}
                />
              </SettingsForm>
            </SettingsGroup>
          )}
        </SettingsScrollView>
      </KeyboardAvoidingView>

      <FloatingPanel visible={stepUp !== null} onDismiss={closeStepUp}>
        <Text variant="title3" style={{ marginBottom: spacing[4] }}>
          {stepUp === "disable" ? "Turn off authenticator?" : "New backup codes"}
        </Text>
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
          {stepUp === "disable"
            ? "Enter a current authenticator or backup code to turn it off."
            : "Enter a current authenticator or backup code. Your old backup codes will stop working."}
        </Text>
        <Input
          label="Authenticator or backup code"
          value={mfaCode}
          onChangeText={(value) => {
            setMfaCode(value);
            if (error) setError("");
          }}
          placeholder="123456 or xxxx-xxxx"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          error={error || undefined}
          onSubmitEditing={() => void submitStepUp()}
        />
        <View style={{ height: spacing[20] }} />
        <Button
          label={stepUp === "disable" ? "Turn off" : "Create codes"}
          variant={stepUp === "disable" ? "danger" : "primary"}
          block
          size="lg"
          loading={busy}
          onPress={() => void submitStepUp()}
        />
        <View style={{ height: spacing[10] }} />
        <Button label="Cancel" variant="ghost" block disabled={busy} onPress={closeStepUp} />
      </FloatingPanel>

      <BackupCodesDialog codes={backupCodes} onClose={() => setBackupCodes(null)} />
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
};
