/**
 * Register screen. Respects server registration status (info.registrationEnabled).
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { AuthShell } from "../../src/components/auth/AuthShell";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { useRegister } from "../../src/hooks/use-auth-actions";
import { useServerInfo } from "../../src/hooks/queries";
import { errorMessage } from "../../src/lib/error-message";
import { haptics } from "../../src/lib/haptics";
import { spacing } from "../../src/theme/tokens";
import { RegisterSchema } from "@ordo/shared";

export default function RegisterScreen() {
  const register = useRegister();
  const { data: info } = useServerInfo();
  const registrationEnabled = info?.registrationEnabled ?? true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    const parsed = RegisterSchema.safeParse({ email: email.trim().toLowerCase(), password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }
    try {
      await register.mutateAsync(parsed.data);
      haptics.success();
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save articles and read them in a clean, focused space."
      footer={
        <View style={styles.row}>
          <Text variant="footnote" color="secondary">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text variant="footnote" color="accent" style={styles.link}>Sign in</Text>
          </Link>
        </View>
      }
    >
      {!registrationEnabled ? (
        <View style={[styles.disabledCard]}>
          <Text variant="callout">Sign-ups are closed on this server.</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: spacing[4] }}>
            Contact the server administrator for an account.
          </Text>
        </View>
      ) : (
        <>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={formError || undefined}
          />
          <View style={{ height: spacing[16] }} />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry={!showPwd}
            textContentType="newPassword"
            helper="Use 8 characters or more."
            rightAccessory={
              <Button label={showPwd ? "Hide" : "Show"} variant="ghost" size="md" onPress={() => setShowPwd((v) => !v)} />
            }
          />
          <View style={{ height: spacing[16] }} />
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter your password"
            secureTextEntry={!showPwd}
            textContentType="newPassword"
          />

          <View style={{ height: spacing[24] }} />
          <Button label="Create account" block size="lg" onPress={submit} loading={register.isPending} />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { textDecorationLine: "underline" },
  disabledCard: { padding: spacing[16], borderRadius: 12 },
});
