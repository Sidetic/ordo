/** Verify and switch the self-hosted Ordo server. */
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { ServerProbeLog } from "../../../src/components/ui/ServerProbeLog";
import { FloatingPanel } from "../../../src/components/ui/FloatingPanel";
import { Text } from "../../../src/components/ui/Text";
import { toast } from "../../../src/components/ui/toast-store";
import { useServerInfo } from "../../../src/hooks/queries";
import { cancelProactiveRefresh } from "../../../src/lib/api/client";
import { queryClient } from "../../../src/lib/query-client";
import {
  hostOf,
  normalizeServerUrl,
  probeServer,
  type ProbeStep,
} from "../../../src/lib/server-probe";
import { useAuthStore } from "../../../src/store/auth";
import { useFolderTokenStore } from "../../../src/store/folder-tokens";
import { useSettingsStore } from "../../../src/store/settings";
import { restartRuntime } from "../../../src/store/update-restart";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { haptics } from "../../../src/lib/haptics";
import { radius, spacing } from "../../../src/theme/tokens";

export default function ServerScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const currentUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearFolderTokens = useFolderTokenStore((s) => s.clearAll);
  const serverInfo = useServerInfo();
  const [url, setUrl] = useState(currentUrl);
  const [steps, setSteps] = useState<ProbeStep[]>([]);
  const [probing, setProbing] = useState(false);
  const [reachable, setReachable] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalized = normalizeServerUrl(url);
  const unchanged = !normalized || normalized === normalizeServerUrl(currentUrl);
  const canChange = !!normalized && !unchanged && reachable && !probing && !rechecking;

  useEffect(() => {
    let cancelled = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (unchanged) {
      setSteps([]);
      setReachable(false);
      setProbing(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setProbing(true);
      setReachable(false);
      void probeServer(url, (nextSteps) => {
        if (!cancelled) setSteps(nextSteps);
      }).then((result) => {
        if (cancelled) return;
        setProbing(false);
        setReachable(result.status === "up");
      });
    }, 900);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [unchanged, url]);

  const requestSwitch = async () => {
    if (!normalized || !canChange) return;
    setRechecking(true);
    const result = await probeServer(normalized, setSteps);
    setRechecking(false);
    if (result.status === "up" && result.url) {
      setConfirmedUrl(result.url);
    } else {
      setReachable(false);
    }
  };

  const confirmSwitch = async () => {
    if (!confirmedUrl || switching) return;
    setSwitching(true);
    let switchCommitted = false;

    try {
      await restartRuntime(async () => {
        cancelProactiveRefresh();
        queryClient.clear();
        await Promise.all([
          clearAuth(),
          clearFolderTokens(),
          setServerUrl(confirmedUrl),
        ]);
        switchCommitted = true;
      });
    } catch {
      if (!switchCommitted) {
        setSwitching(false);
        toast.error("Couldn't change server");
        return;
      }
    }

    if (switchCommitted) {
      setSwitching(false);
      setConfirmedUrl(null);
      toast.success("Server changed");
      router.replace("/(auth)/login");
    }
  };

  const connectionValue = serverInfo.error
    ? "Unavailable"
    : serverInfo.data
      ? "Connected"
      : "Checking...";
  const testing = probing || rechecking || serverInfo.isFetching;

  const refreshConnection = () => {
    if (testing) return;
    haptics.light();
    void serverInfo.refetch();
    if (!unchanged && url.trim()) {
      setProbing(true);
      setReachable(false);
      void probeServer(url, setSteps).then((result) => {
        setProbing(false);
        setReachable(result.status === "up");
      });
    }
  };

  return (
    <SettingsPage
      title="Server"
      right={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Refresh connection test"
          accessibilityState={{ disabled: testing }}
          style={styles.refreshAction}
          scaleTo={0.85}
          hitSlop={8}
          disabled={testing}
          onPress={refreshConnection}
        >
          <Ionicons
            name={testing ? "sync-outline" : "refresh"}
            size={22}
            color={testing ? palette.textTertiary : palette.accent}
          />
        </PressableScale>
      }
    >
      <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <SettingsGroup label="Current server" compact>
          <SettingRow
            icon={
              serverInfo.isLoading
                ? "sync-outline"
                : serverInfo.data && !serverInfo.error
                  ? "checkmark-circle-outline"
                  : "cloud-offline-outline"
            }
            label={hostOf(currentUrl)}
            description={currentUrl}
            value={connectionValue}
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Change server" footer="Switching servers signs you out and restarts Ordo.">
          <SettingsForm style={styles.editor}>
            <Input
              label="Server URL"
              value={url}
              onChangeText={setUrl}
              placeholder="https://ordo.example.com"
              mono
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Ionicons name="link" size={15} color={palette.textTertiary} />}
            />
            {!unchanged ? <ServerProbeLog steps={steps} probing={probing} /> : null}
            <Button
              label="Change server"
              block
              size="lg"
              disabled={!canChange}
              loading={rechecking}
              onPress={() => void requestSwitch()}
              style={styles.changeButton}
            />
          </SettingsForm>
        </SettingsGroup>
      </SettingsScrollView>

      <FloatingPanel
        visible={!!confirmedUrl}
        onDismiss={switching ? () => {} : () => setConfirmedUrl(null)}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.confirmHeader}>
          <View style={[styles.confirmIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="log-out-outline" size={20} color={palette.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title2">Switch server?</Text>
            <Text variant="footnote" color="secondary" style={styles.confirmCopy}>
              You will be signed out and Ordo will restart.
            </Text>
          </View>
        </View>
        <View style={[styles.hostChange, { borderColor: palette.border }]}>
          <Text variant="monoSmall" color="tertiary" numberOfLines={1}>
            {hostOf(currentUrl)}
          </Text>
          <Ionicons name="arrow-down" size={14} color={palette.textTertiary} />
          <Text variant="monoSmall" numberOfLines={1}>
            {confirmedUrl ? hostOf(confirmedUrl) : ""}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            label="Cancel"
            variant="secondary"
            disabled={switching}
            onPress={() => setConfirmedUrl(null)}
            style={{ flex: 1 }}
          />
          <Button
            label="Switch and restart"
            variant="danger"
            loading={switching}
            onPress={() => void confirmSwitch()}
            style={{ flex: 2 }}
          />
        </View>
        </ScrollView>
      </FloatingPanel>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  editor: { padding: spacing[16] },
  changeButton: { marginTop: spacing[16] },
  refreshAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  confirmHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing[12] },
  confirmIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCopy: { marginTop: spacing[2] },
  hostChange: {
    marginTop: spacing[16],
    padding: spacing[14],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    gap: spacing[8],
  },
  actions: { flexDirection: "row", gap: spacing[10], marginTop: spacing[20] },
});
