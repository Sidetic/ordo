/**
 * Verify an email change — step 2: enter the code sent to the new address.
 * Reached after submitting a change-email request.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
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
    if (!token.trim()) {
      setFormError("Enter your verification code.");
      return;
    }
    try {
      await verify.mutateAsync(token.trim());
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
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[20], paddingTop: spacing[20], paddingBottom: spacing[32] }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Input
            label="Verification code"
            value={token}
            onChangeText={setToken}
            placeholder="Enter code"
            autoCapitalize="none"
            autoCorrect={false}
            helper={`Code sent to ${target}.`}
            error={formError || undefined}
          />
          <View style={{ height: spacing[24] }} />
          <Button label="Verify" block size="lg" onPress={submit} loading={verify.isPending} />
          <View style={{ height: spacing[12] }} />
          <Button
            label={resend.isPending ? "Sending…" : "Resend code"}
            variant="ghost"
            block
            onPress={onResend}
            loading={resend.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SettingsPage>
  );
}
