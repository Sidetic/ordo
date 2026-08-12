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
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import { ChangePasswordSchema } from "@ordo/shared";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");

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
    try {
      await changePassword.mutateAsync(parsed.data);
      haptics.success();
      toast.success("Password changed. All devices were signed out.");
      router.back();
    } catch (e) {
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
                helper="Use 8 characters or more."
              />
              <Input
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your new password"
                secureTextEntry={!showPwd}
                textContentType="newPassword"
              />

              <Button
                label="Change password"
                block
                size="lg"
                onPress={submit}
                loading={changePassword.isPending}
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
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
  formError: { textAlign: "center" as const },
};
