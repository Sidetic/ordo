/** Account identity and security settings. */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChangeUsernameSchema } from "@ordo/shared";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { toast } from "../../../src/components/ui/toast-store";
import { useAuthStore } from "../../../src/store/auth";
import { useChangeUsername } from "../../../src/hooks/use-auth-actions";
import { errorMessage } from "../../../src/lib/error-message";
import { formatDate } from "../../../src/lib/format";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const changeUsername = useChangeUsername();
  const [username, setUsername] = useState(user?.username ?? "");
  const [formError, setFormError] = useState("");

  const submitUsername = async () => {
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
    } catch (error) {
      haptics.error();
      setFormError(errorMessage(error));
    }
  };

  return (
    <SettingsPage title="Account">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup label="Profile" compact>
            <SettingsForm style={styles.form}>
              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="2-32 chars, letters, numbers, _ or -"
                autoCapitalize="none"
                helper="Letters, numbers, underscores and hyphens. 2-32 characters."
                error={formError || undefined}
              />
              <Button
                label="Save username"
                block
                size="lg"
                onPress={submitUsername}
                loading={changeUsername.isPending}
                disabled={!username.trim() || username.trim() === (user?.username ?? "")}
                style={styles.saveButton}
              />
            </SettingsForm>
          </SettingsGroup>

          <SettingsGroup label="Sign-in">
            <SettingRow
              icon="mail-outline"
              label="Email"
              value={user?.email ?? "—"}
              onPress={() => router.push("/settings/email")}
              showChevron
            />
            <SettingRow
              icon="lock-closed-outline"
              label="Password"
              value="*****"
              onPress={() => router.push("/settings/password")}
              showChevron
            />
            <SettingRow
              icon="calendar-outline"
              label="Member since"
              value={user ? formatDate(user.createdAt) : "—"}
              divider={false}
            />
          </SettingsGroup>
        </SettingsScrollView>
      </KeyboardAvoidingView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing[16] },
  saveButton: { marginTop: spacing[16] },
});
