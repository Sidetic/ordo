/**
 * Login screen.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthShell } from "../../src/components/auth/AuthShell";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { ServerConnectSheet } from "../../src/components/auth/ServerConnectSheet";
import { EyeToggle } from "../../src/components/ui/EyeToggle";
import { useSettingsStore } from "../../src/store/settings";
import { useLogin } from "../../src/hooks/use-auth-actions";
import { errorMessage } from "../../src/lib/error-message";
import { haptics } from "../../src/lib/haptics";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing } from "../../src/theme/tokens";
import { LoginSchema } from "@ordo/shared";

export default function LoginScreen() {
  const { palette } = useTheme();
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
        footer={
          <View style={styles.row}>
            <Text variant="footnote" color="secondary">No account yet? </Text>
            <Link href="/(auth)/register" asChild replace>
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
          rightAccessory={<EyeToggle visible={showPwd} onPress={() => setShowPwd((v) => !v)} />}
        />

        <View style={{ height: spacing[24] }} />
        <Button label="Sign in" block size="lg" onPress={submit} loading={login.isPending} />

        <View style={styles.serverSection}>
          <Text variant="label" color="tertiary" style={styles.serverLabel}>Server URL</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Change server URL. Current server: ${serverUrl}`}
            scaleTo={0.985}
            onPress={() => {
              haptics.light();
              setShowServer(true);
            }}
            style={[
              styles.serverBox,
              {
                backgroundColor: palette.surface,
                borderColor: palette.borderStrong,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Ionicons name="link-outline" size={16} color={palette.textTertiary} />
            <Text variant="mono" numberOfLines={1} style={styles.serverUrl}>{serverUrl}</Text>
            <View style={[styles.serverDivider, { backgroundColor: palette.borderStrong }]} />
            <Text variant="label" color="accent">Change</Text>
          </PressableScale>
        </View>
      </AuthShell>

      <ServerConnectSheet visible={showServer} onDismiss={() => setShowServer(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { textDecorationLine: "underline" },
  serverSection: { marginTop: spacing[20] },
  serverLabel: { marginBottom: spacing[6] },
  serverBox: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  serverUrl: { flex: 1 },
  serverDivider: { width: StyleSheet.hairlineWidth, height: 22 },
});
