import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { useChangePassword } from "../../../src/hooks/use-auth-actions";
import { errorMessage, isMfaRequiredError } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { MfaStepUpPanel } from "../../../src/components/auth/MfaStepUpPanel";
import { useAuthStore } from "../../../src/store/auth";
import { spacing } from "../../../src/theme/tokens";
import { ChangePasswordSchema } from "@ordo/shared";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const changePassword = useChangePassword();
  const mfaEnabled = useAuthStore((s) => s.user?.mfaEnabled);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);

  const commit = async (mfaCode?: string) => {
    const parsed = ChangePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      mfaCode,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Please check your input.");
    }
    await changePassword.mutateAsync(parsed.data);
    haptics.success();
    toast.success("Password changed. All devices were signed out.");
    router.back();
  };

  const submit = async () => {
    setFormError("");
    if (newPassword !== confirm) {
      setFormError("New passwords don't match.");
      return;
    }
    const parsed = ChangePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }
    if (mfaEnabled) {
      setMfaOpen(true);
      return;
    }
    try {
      await commit();
    } catch (e) {
      if (isMfaRequiredError(e)) {
        setMfaOpen(true);
        return;
      }
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <SettingsPage title="Password">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup label="Change password" compact footer="Changing your password signs out every device, including this one.">
            <SettingsForm style={styles.form}>
              <Input
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry={!showPwd}
                textContentType="password"
                autoComplete="current-password"
                importantForAutofill="yes"
                rightAccessory={
                  <Button label={showPwd ? "Hide" : "Show"} variant="ghost" size="md" onPress={() => setShowPwd((v) => !v)} />
                }
              />
              <Input
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry={!showPwd}
                textContentType="newPassword"
                autoComplete="new-password"
                importantForAutofill="yes"
              />
              <Input
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your new password"
                secureTextEntry={!showPwd}
                textContentType="newPassword"
                autoComplete="new-password"
                importantForAutofill="yes"
              />

              <Button
                label="Change password"
                block
                size="lg"
                onPress={submit}
                loading={changePassword.isPending && !mfaOpen}
              />
              {formError ? (
                <Text variant="footnote" color="danger" style={styles.formError}>
                  {formError}
                </Text>
              ) : null}
            </SettingsForm>
          </SettingsGroup>
        </SettingsScrollView>
      </KeyboardAvoidingView>

      <MfaStepUpPanel
        visible={mfaOpen}
        onDismiss={() => setMfaOpen(false)}
        title="Change password"
        description="Enter a current authenticator or backup code to change your password."
        confirmLabel="Change password"
        onConfirm={commit}
        onUnhandledError={(e) => {
          haptics.error();
          setFormError(errorMessage(e));
        }}
      />
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
  formError: { textAlign: "center" as const },
};
