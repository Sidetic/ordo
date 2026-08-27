import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  DeleteAccountSchema,
} from "@ordo/shared";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { toast } from "../../../src/components/ui/toast-store";
import { MfaStepUpPanel } from "../../../src/components/auth/MfaStepUpPanel";
import { useDeleteAccount } from "../../../src/hooks/use-auth-actions";
import { useAuthStore } from "../../../src/store/auth";
import { errorMessage, isMfaRequiredError } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function DeleteAccountScreen() {
  const deleteAccount = useDeleteAccount();
  const mfaEnabled = useAuthStore((s) => s.user?.mfaEnabled);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);

  const commit = async (mfaCode?: string) => {
    const parsed = DeleteAccountSchema.safeParse({
      currentPassword,
      confirmation,
      mfaCode,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Please check your input.");
    }
    await deleteAccount.mutateAsync(parsed.data);
    haptics.success();
    toast.success("Account deleted");
  };

  const submit = async () => {
    if (deleteAccount.isPending) return;
    setFormError("");
    const parsed = DeleteAccountSchema.safeParse({
      currentPassword,
      confirmation,
    });
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
    } catch (error) {
      if (isMfaRequiredError(error)) {
        setMfaOpen(true);
        return;
      }
      haptics.error();
      setFormError(errorMessage(error));
    }
  };

  const confirmed = confirmation === DELETE_ACCOUNT_CONFIRMATION;

  return (
    <SettingsPage title="Delete account">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup
            label="Danger zone"
            compact
            footer="All bookmarks, folders, and sessions will be permanently deleted. This cannot be undone."
          >
            <SettingsForm style={styles.form}>
              <Text variant="body" color="secondary">
                Enter your password and type {DELETE_ACCOUNT_CONFIRMATION} to confirm.
              </Text>
              <Input
                label="Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                textContentType="password"
                rightAccessory={
                  <Button
                    label={showPassword ? "Hide" : "Show"}
                    variant="ghost"
                    size="md"
                    onPress={() => setShowPassword((value) => !value)}
                  />
                }
              />
              <Input
                label="Confirmation"
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder={DELETE_ACCOUNT_CONFIRMATION}
                autoCapitalize="characters"
                autoCorrect={false}
                mono
                onSubmitEditing={submit}
              />
              <Button
                label="Delete account"
                variant="danger"
                block
                size="lg"
                loading={deleteAccount.isPending && !mfaOpen}
                disabled={!currentPassword || !confirmed}
                onPress={submit}
              />
              {formError ? (
                <Text variant="footnote" color="danger" align="center">
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
        title="Delete account?"
        description="Enter a current authenticator or backup code to permanently delete your account."
        confirmLabel="Delete account"
        confirmVariant="danger"
        onConfirm={commit}
        onUnhandledError={(error) => {
          haptics.error();
          setFormError(errorMessage(error));
        }}
      />
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
};
