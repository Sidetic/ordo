/**
 * Change email — step 1: confirm current password + enter the new email.
 * On success the server sends a verification code to the new address and we
 * navigate to the verify screen.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../../src/components/ui/Header";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { useRequestEmailChange } from "../../../src/hooks/use-auth-actions";
import { useAuthStore } from "../../../src/store/auth";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import { ChangeEmailSchema } from "@ordo/shared";

export default function ChangeEmailScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const requestEmailChange = useRequestEmailChange();

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
      toast.success(`Verification code sent to ${parsed.data.newEmail}`);
      router.replace({ pathname: "/settings/verify-email", params: { email: parsed.data.newEmail } });
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Email" showBack subtitle="Used to sign in to your account." />
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
            label="Current email"
            value={user?.email ?? ""}
            onChangeText={() => {}}
            editable={false}
          />
          <View style={{ height: spacing[16] }} />
          <Input
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
          />
          <View style={{ height: spacing[16] }} />
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

          <View style={{ height: spacing[24] }} />
          <Button
            label="Send verification code"
            block
            size="lg"
            onPress={submit}
            loading={requestEmailChange.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
