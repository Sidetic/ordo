import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ChangeUsernameSchema } from "@ordo/shared";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Button } from "../../../src/components/ui/Button";
import { Input } from "../../../src/components/ui/Input";
import { toast } from "../../../src/components/ui/toast-store";
import { useChangeUsername } from "../../../src/hooks/use-auth-actions";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { useAuthStore } from "../../../src/store/auth";
import { spacing } from "../../../src/theme/tokens";

export default function ChangeUsernameScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const changeUsername = useChangeUsername();
  const [username, setUsername] = useState(user?.username ?? "");
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    const parsed = ChangeUsernameSchema.safeParse({ newUsername: username.trim() });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }

    try {
      await changeUsername.mutateAsync(parsed.data);
      haptics.success();
      toast.success("Username updated");
      router.back();
    } catch (error) {
      haptics.error();
      setFormError(errorMessage(error));
    }
  };

  const unchanged = username.trim() === (user?.username ?? "");

  return (
    <SettingsPage title="Username">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup
            label="Change username"
            compact
            footer="Use 2-32 letters, numbers, underscores, or hyphens."
          >
            <SettingsForm style={styles.form}>
              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter a username"
                autoCapitalize="none"
                autoComplete="username-new"
                textContentType="username"
                error={formError || undefined}
              />
              <Button
                label="Save username"
                block
                size="lg"
                onPress={submit}
                loading={changeUsername.isPending}
                disabled={!username.trim() || unchanged}
              />
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
