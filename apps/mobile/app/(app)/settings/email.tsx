/**
 * Change email — step 1: confirm current password + enter the new email.
 * On success the server sends a verification code to the new address and we
 * navigate to the verify screen.
 *
 * Settings routes live in a tab navigator that keeps screens mounted. The form
 * is keyed by the signed-in email so a completed change cannot leave the
 * previous address and password sitting in the next visit.
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
import { errorMessage, isMfaRequiredError } from "../../../src/lib/error-message";
import { otpRequestFooter, otpSentToast } from "../../../src/lib/otp-copy";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import { ChangeEmailSchema } from "@ordo/shared";
import { OtpDeliveryHint } from "../../../src/components/auth/OtpDeliveryHint";
import { MfaStepUpPanel } from "../../../src/components/auth/MfaStepUpPanel";

export default function ChangeEmailScreen() {
  const email = useAuthStore((s) => s.user?.email ?? "");
  return <ChangeEmailForm key={email} />;
}

function ChangeEmailForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const requestEmailChange = useRequestEmailChange();
  const { data: info } = useServerInfo();
  const smtpConfigured = info?.smtpConfigured;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);

  const finish = (nextEmail: string) => {
    haptics.success();
    toast.success(otpSentToast(smtpConfigured, nextEmail));
    setNewEmail("");
    setCurrentPassword("");
    setShowPwd(false);
    setFormError("");
    setMfaOpen(false);
    requestEmailChange.reset();
    router.replace({
      pathname: "/settings/verify-email",
      params: { email: nextEmail, nonce: String(Date.now()) },
    });
  };

  const commit = async (mfaCode?: string) => {
    const parsed = ChangeEmailSchema.safeParse({
      currentPassword,
      newEmail: newEmail.trim().toLowerCase(),
      mfaCode,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Please check your input.");
    }
    await requestEmailChange.mutateAsync(parsed.data);
    finish(parsed.data.newEmail);
  };

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
    if (user?.mfaEnabled) {
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
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
              />
              <Input
                label="New email"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCapitalize="none"
              />
              <Input
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry={!showPwd}
                autoComplete="password"
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
                loading={requestEmailChange.isPending && !mfaOpen}
              />
            </SettingsForm>
          </SettingsGroup>
        </SettingsScrollView>
      </KeyboardAvoidingView>

      <MfaStepUpPanel
        visible={mfaOpen}
        onDismiss={() => setMfaOpen(false)}
        title="Change email"
        description="Enter a current authenticator or backup code to change your email."
        confirmLabel="Send verification code"
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
};
