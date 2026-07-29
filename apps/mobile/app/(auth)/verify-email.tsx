/**
 * Email verification screen (only relevant when the server requires it).
 * Reached after signup if EMAIL_VERIFICATION_REQUIRED is on.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
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
  const verify = useVerifyEmail();
  const [token, setToken] = useState("");
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    if (!token.trim()) {
      setFormError("Enter your verification code.");
      return;
    }
    try {
      await verify.mutateAsync(token.trim());
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
      subtitle="We sent a verification code to your inbox. Enter it below to activate your account."
    >
      <Input
        label="Verification code"
        value={token}
        onChangeText={setToken}
        placeholder="Enter code"
        autoCapitalize="none"
        autoCorrect={false}
        error={formError || undefined}
      />
      <View style={{ height: spacing[24] }} />
      <Button label="Verify" block size="lg" onPress={submit} loading={verify.isPending} />
      <View style={{ height: spacing[12] }} />
      <Button label="Back to sign in" variant="ghost" block onPress={() => router.replace("/(auth)/login")} />
    </AuthShell>
  );
}
