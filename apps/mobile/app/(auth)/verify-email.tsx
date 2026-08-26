/**
 * Email verification screen (only relevant when the server requires it).
 * Reached after signup if EMAIL_VERIFICATION_REQUIRED is on, or after login
 * when the account is still unverified.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EMAIL_OTP } from "@ordo/shared";
import { AuthShell } from "../../src/components/auth/AuthShell";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { useVerifyEmail } from "../../src/hooks/use-auth-actions";
import { errorMessage } from "../../src/lib/error-message";
import { haptics } from "../../src/lib/haptics";
import { spacing } from "../../src/theme/tokens";
import { toast } from "../../src/components/ui/toast-store";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const verify = useVerifyEmail();
  const [email, setEmail] = useState(params.email ?? "");
  const [token, setToken] = useState("");
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError("Enter your email address.");
      return;
    }
    if (token.length !== EMAIL_OTP.LENGTH) {
      setFormError("Enter your verification code.");
      return;
    }
    try {
      await verify.mutateAsync({ email: trimmedEmail, token });
      haptics.success();
      toast.success("Email verified. You're all set.");
      router.replace("/(auth)/login");
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below to activate your account."
    >
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={{ height: spacing[16] }} />
      <Input
        label="Verification code"
        value={token}
        onChangeText={(value) => setToken(value.replace(/\D/g, "").slice(0, EMAIL_OTP.LENGTH))}
        placeholder="000000"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={EMAIL_OTP.LENGTH}
        error={formError || undefined}
      />
      <View style={{ height: spacing[24] }} />
      <Button label="Verify" block size="lg" onPress={submit} loading={verify.isPending} />
      <View style={{ height: spacing[12] }} />
      <Button label="Back to sign in" variant="ghost" block onPress={() => router.replace("/(auth)/login")} />
    </AuthShell>
  );
}
