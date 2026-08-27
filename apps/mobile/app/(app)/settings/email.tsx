/**
 * Change email — step 1: confirm current password + enter the new email.
 * On success the server sends a verification code to the new address and we
 * navigate to the verify screen.
 */
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
import { useRequestEmailChange } from "../../../src/hooks/use-auth-actions";
import { useAuthStore } from "../../../src/store/auth";
import { useServerInfo } from "../../../src/hooks/queries";
import { errorMessage } from "../../../src/lib/error-message";
import { otpRequestFooter, otpSentToast } from "../../../src/lib/otp-copy";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import { ChangeEmailSchema } from "@ordo/shared";
import { OtpDeliveryHint } from "../../../src/components/auth/OtpDeliveryHint";

export default function ChangeEmailScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const requestEmailChange = useRequestEmailChange();
  const { data: info } = useServerInfo();
  const smtpConfigured = info?.smtpConfigured;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    const parsed = ChangeEmailSchema.safeParse({
      currentPassword,
      newEmail: newEmail.trim().toLowerCase(),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }
    try {
      await requestEmailChange.mutateAsync(parsed.data);
      haptics.success();
      toast.success(otpSentToast(smtpConfigured, parsed.data.newEmail));
      router.replace({ pathname: "/settings/verify-email", params: { email: parsed.data.newEmail } });
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <SettingsPage title="Email">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup
            label="Change email"
            compact
            footer={otpRequestFooter(smtpConfigured, "email-change")}
          >
            <SettingsForm style={styles.form}>
              <OtpDeliveryHint smtpConfigured={smtpConfigured} compact />
              <Input
                label="Current email"
                value={user?.email ?? ""}
                onChangeText={() => {}}
                editable={false}
              />
              <Input
                label="New email"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
              />
              <Input
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry={!showPwd}
                textContentType="password"
                error={formError || undefined}
                rightAccessory={
                  <Button label={showPwd ? "Hide" : "Show"} variant="ghost" size="md" onPress={() => setShowPwd((v) => !v)} />
                }
              />

              <Button
                label="Send verification code"
                block
                size="lg"
                onPress={submit}
                loading={requestEmailChange.isPending}
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
