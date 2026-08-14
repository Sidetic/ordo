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
import { useDeleteAccount } from "../../../src/hooks/use-auth-actions";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function DeleteAccountScreen() {
  const deleteAccount = useDeleteAccount();
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    if (deleteAccount.isPending) return;
    setFormError("");
    const parsed = DeleteAccountSchema.safeParse({ currentPassword, confirmation });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }

    try {
      await deleteAccount.mutateAsync(parsed.data);
      haptics.success();
      toast.success("Account deleted");
    } catch (error) {
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
                loading={deleteAccount.isPending}
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
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[16] },
};
