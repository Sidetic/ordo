import React, { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Text";
import { OtpInput } from "../ui/OtpInput";
import { authApi } from "../../lib/api/auth";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";
import { useAuthStore } from "../../store/auth";
import type { UserDto } from "@ordo/shared";

export function MfaSetupPanel({
  onEnabled,
  existingCode,
}: {
  onEnabled: (user: UserDto, backupCodes: string[]) => void;
  /** Required when rotating an already-enabled authenticator. */
  existingCode?: string;
}) {
  const { palette } = useTheme();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    setStarting(true);
    try {
      const result = await authApi.totpBegin(existingCode ? { mfaCode: existingCode } : {});
      setSecret(result.secret);
      setOtpauthUrl(result.otpauthUrl);
      haptics.success();
    } catch (e) {
      haptics.error();
      setError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const confirm = async (code: string) => {
    setError("");
    setConfirming(true);
    try {
      const result = await authApi.totpConfirm({ code });
      haptics.success();
      onEnabled(result.user, result.backupCodes);
    } catch (e) {
      haptics.error();
      setError(errorMessage(e));
    } finally {
      setConfirming(false);
    }
  };

  if (!secret || !otpauthUrl) {
    return (
      <View style={styles.block}>
        <Text variant="body" color="secondary">
          Use an authenticator app such as Aegis, Authy, or Google Authenticator.
        </Text>
        <Button label="Set up authenticator" block size="lg" loading={starting} onPress={start} />
        {error ? (
          <Text variant="footnote" color="danger" align="center">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={[styles.qr, { backgroundColor: "#fff", borderColor: palette.border }]}>
        <QRCode value={otpauthUrl} size={180} />
      </View>
      <Text variant="footnote" color="secondary" align="center">
        Can't scan? Enter this key in your app:
      </Text>
      <Pressable
        onPress={() => {
          void Share.share({ message: secret, title: "Authenticator key" }).catch(() => undefined);
        }}
      >
        <Text variant="mono" align="center" style={styles.secret}>
          {secret}
        </Text>
      </Pressable>
      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={confirm}
        status={confirming ? "loading" : error ? "error" : "idle"}
        label="Authenticator code"
      />
      {error ? (
        <Text variant="footnote" color="danger" align="center">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function MfaCodeField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const enabled = useAuthStore((s) => s.user?.mfaEnabled);
  if (!enabled) return null;
  return (
    <Input
      label="Authenticator or backup code"
      value={value}
      onChangeText={onChange}
      placeholder="123456 or xxxx-xxxx"
      autoCapitalize="none"
      autoCorrect={false}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[16] },
  qr: {
    alignSelf: "center",
    padding: spacing[16],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secret: { letterSpacing: 1 },
});
