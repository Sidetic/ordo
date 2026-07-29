/**
 * Login screen.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { AuthShell } from "../../src/components/auth/AuthShell";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { ServerConnectSheet } from "../../src/components/auth/ServerConnectSheet";
import { useSettingsStore } from "../../src/store/settings";
import { useLogin } from "../../src/hooks/use-auth-actions";
import { errorMessage } from "../../src/lib/error-message";
import { haptics } from "../../src/lib/haptics";
import { spacing } from "../../src/theme/tokens";
import { LoginSchema } from "@ordo/shared";

export default function LoginScreen() {
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    const parsed = LoginSchema.safeParse({ email: email.trim().toLowerCase(), password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }
    try {
      await login.mutateAsync(parsed.data);
      haptics.success();
    } catch (e) {
      haptics.error();
      setFormError(errorMessage(e));
    }
  };

  return (
    <>
      <AuthShell
        title="Welcome back"
        subtitle="Sign in to your reading list."
        footer={
          <View style={styles.row}>
            <Text variant="footnote" color="secondary">No account yet? </Text>
            <Link href="/(auth)/register" asChild>
              <Text variant="footnote" color="accent" style={styles.link}>Create one</Text>
            </Link>
          </View>
        }
      >
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
          placeholder="••••••••"
          secureTextEntry={!showPwd}
          textContentType="password"
          rightAccessory={
            <Button
              label={showPwd ? "Hide" : "Show"}
              variant="ghost"
              size="md"
              onPress={() => setShowPwd((v) => !v)}
            />
          }
        />

        <View style={{ height: spacing[24] }} />
        <Button label="Sign in" block size="lg" onPress={submit} loading={login.isPending} />

        <View style={styles.serverRow}>
          <Text variant="caption" color="tertiary" numberOfLines={1}>{serverUrl}</Text>
          <Button label="Change" variant="ghost" size="md" onPress={() => setShowServer(true)} />
        </View>
      </AuthShell>

      <ServerConnectSheet visible={showServer} onDismiss={() => setShowServer(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { textDecorationLine: "underline" },
  serverRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing[20] },
});
