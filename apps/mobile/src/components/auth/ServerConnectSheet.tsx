/**
 * Sheet for pointing the app at a different backend instance. Tests the
 * connection via GET /server/info and reports status before saving.
 * Reused on the login screen (pre-auth) and in Settings.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { useSettingsStore } from "../../store/settings";
import { serverApi } from "../../lib/api/server";
import { errorMessage } from "../../lib/error-message";
import type { ServerInfoDto } from "@ordo/shared";

export interface ServerConnectSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSaved?: () => void;
}

export function ServerConnectSheet({ visible, onDismiss, onSaved }: ServerConnectSheetProps) {
  const { palette } = useTheme();
  const currentUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);
  const [url, setUrl] = useState(currentUrl);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [info, setInfo] = useState<ServerInfoDto | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setUrl(currentUrl);
      setStatus("idle");
      setInfo(null);
      setError("");
    }
  }, [visible, currentUrl]);

  const normalized = url.trim().replace(/\/+$/, "");

  const test = async () => {
    if (!normalized) {
      setError("Enter a server URL.");
      return;
    }
    setStatus("testing");
    setInfo(null);
    setError("");
    const prev = useSettingsStore.getState().serverUrl;
    // Temporarily point the API at the candidate URL for the probe.
    setServerUrl(normalized);
    try {
      const result = await serverApi.info();
      setInfo(result);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setError(errorMessage(e));
      setServerUrl(prev); // revert on failure
    }
  };

  const save = () => {
    setServerUrl(normalized);
    onDismiss();
    onSaved?.();
  };

  return (
    <Sheet visible={visible} onDismiss={onDismiss}>
      <Text variant="title3" style={{ marginBottom: spacing[4] }}>
        Connect to server
      </Text>
      <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
        Ordo is self-hostable. Point the app at any Ordo backend instance.
      </Text>

      <Input
        label="Server URL"
        value={url}
        onChangeText={setUrl}
        placeholder="https://ordo.example.com"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        helper={error || undefined}
        error={status === "error" ? error || "Couldn't connect" : undefined}
      />

      {status === "ok" && info ? (
        <View style={[styles.status, { backgroundColor: palette.accentSoft }]}>
          <Text variant="footnote" color="accent">
            Connected · {info.name} v{info.version}
          </Text>
          <Text variant="caption" color="secondary">
            {info.registrationEnabled ? "Open to sign-ups" : "Sign-ups closed"}
            {info.emailVerificationRequired ? " · email verification required" : ""}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Test connection" variant="secondary" onPress={test} loading={status === "testing"} />
        <Button label="Save" variant="primary" onPress={save} disabled={status !== "ok"} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  status: { paddingHorizontal: spacing[12], paddingVertical: spacing[10], borderRadius: 10, marginTop: spacing[12] },
  actions: { flexDirection: "row", gap: spacing[12], marginTop: spacing[20] },
});
