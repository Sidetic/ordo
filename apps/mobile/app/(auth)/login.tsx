/**
 * Login screen.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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
import { ApiClientError } from "../../src/lib/api/client";
import { haptics } from "../../src/lib/haptics";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing } from "../../src/theme/tokens";
import { ErrorCode, LoginSchema, isMfaRequiredResponse } from "@ordo/shared";

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ identifier?: string; nonce?: string }>();
  const identifier = routeParam(params.identifier);
  const nonce = routeParam(params.nonce);
  return <LoginForm key={`${nonce}:${identifier}`} initialIdentifier={identifier} />;
}

function LoginForm({ initialIdentifier }: { initialIdentifier: string }) {
  const { palette } = useTheme();
  const router = useRouter();
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const login = useLogin();

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setFormError("");
    const parsed = LoginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Please check your input.");
      return;
    }
    try {
      const result = await login.mutateAsync(parsed.data);
      if (isMfaRequiredResponse(result)) {
        haptics.light();
        router.push({
          pathname: "/(auth)/mfa",
          params: {
            challengeToken: result.challengeToken,
            email: parsed.data.identifier,
            emailRecovery: result.emailRecoveryAvailable ? "1" : "0",
          },
        });
        return;
      }
      haptics.success();
    } catch (e) {
      haptics.error();
      if (e instanceof ApiClientError && e.code === ErrorCode.EMAIL_NOT_VERIFIED) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: parsed.data.identifier.trim().toLowerCase() },
        });
        return;
      }
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
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          importantForAutofill="yes"
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
          autoComplete="current-password"
          importantForAutofill="yes"
          rightAccessory={<EyeToggle visible={showPwd} onPress={() => setShowPwd((v) => !v)} />}
        />
        <View style={styles.forgotRow}>
          <Link href="/(auth)/forgot-password" asChild>
            <Text variant="footnote" color="accent" style={styles.link}>Forgot password?</Text>
          </Link>
        </View>

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

      <ServerConnectSheet
        visible={showServer}
        onDismiss={() => setShowServer(false)}
        animateReadyColor
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { textDecorationLine: "underline" },
  serverSection: { marginTop: spacing[20] },
  serverLabel: { marginBottom: spacing[6] },
  forgotRow: { marginTop: spacing[10], alignItems: "flex-end" },
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
