/**
 * Change username. No password required (username is a non-unique display name).
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../../src/components/ui/Header";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { useChangeUsername } from "../../../src/hooks/use-auth-actions";
import { useAuthStore } from "../../../src/store/auth";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import { ChangeUsernameSchema } from "@ordo/shared";

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
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Username" showBack subtitle="The display name shown on your account." />
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
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="2–32 chars, letters, numbers, _ or -"
            autoCapitalize="none"
            helper="Letters, numbers, underscores and hyphens. 2–32 characters."
            error={formError || undefined}
          />
          <View style={{ height: spacing[24] }} />
          <Button
            label="Save"
            block
            size="lg"
            onPress={submit}
            loading={changeUsername.isPending}
            disabled={username.trim() === (user?.username ?? "")}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
