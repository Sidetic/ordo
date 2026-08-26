/**
 * Verify an email change — step 2: enter the code sent to the new address.
 * Reached after submitting a change-email request.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EMAIL_OTP } from "@ordo/shared";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { useResendEmailChange, useVerifyEmailChange } from "../../../src/hooks/use-auth-actions";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";

export default function VerifyEmailChangeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const verify = useVerifyEmailChange();
  const resend = useResendEmailChange();

  const [token, setToken] = useState("");
  const [formError, setFormError] = useState("");

  const target = params.email ?? "your new address";

  const submit = async () => {
    setFormError("");
    if (token.length !== EMAIL_OTP.LENGTH) {
      setFormError("Enter your verification code.");
      return;
    }
    try {
      await verify.mutateAsync(token);
      haptics.success();
      toast.success("Email updated");
      router.replace("/settings");
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  const onResend = async () => {
    try {
      await resend.mutateAsync();
      toast.success(`New code sent to ${target}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <SettingsPage title="Verify new email">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SettingsGroup label="Verification" compact footer={`Enter the code sent to ${target}.`}>
            <SettingsForm style={styles.form}>
              <Input
                label="Verification code"
                value={token}
                onChangeText={(value) => setToken(value.replace(/\D/g, "").slice(0, EMAIL_OTP.LENGTH))}
                placeholder="000000"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={EMAIL_OTP.LENGTH}
                helper={`Code sent to ${target}.`}
                error={formError || undefined}
              />
              <Button label="Verify" block size="lg" onPress={submit} loading={verify.isPending} />
              <Button
                label={resend.isPending ? "Sending…" : "Resend code"}
                variant="ghost"
                block
                onPress={onResend}
                loading={resend.isPending}
              />
            </SettingsForm>
          </SettingsGroup>
        </SettingsScrollView>
      </KeyboardAvoidingView>
    </SettingsPage>
  );
}

const styles = {
  form: { padding: spacing[16], gap: spacing[12] },
};
