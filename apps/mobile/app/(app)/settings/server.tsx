/** Verify and switch the self-hosted Ordo server. */
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { ServerHistoryPanel } from "../../../src/components/settings/ServerHistoryPanel";
import { Input } from "../../../src/components/ui/Input";
import { Button } from "../../../src/components/ui/Button";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { ServerProbeLog } from "../../../src/components/ui/ServerProbeLog";
import { ConfirmDialog } from "../../../src/components/ui/ConfirmDialog";
import { Segmented } from "../../../src/components/ui/Segmented";
import { Text } from "../../../src/components/ui/Text";
import { toast } from "../../../src/components/ui/toast-store";
import { useServerInfo } from "../../../src/hooks/queries";
import { cancelProactiveRefresh } from "../../../src/lib/api/client";
import { queryClient } from "../../../src/lib/query-client";
import { visibleServerHistory } from "../../../src/lib/server-history";
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
import { layout, radius, spacing } from "../../../src/theme/tokens";

const TABS = [
  { value: "connection", label: "Connection" },
  { value: "history", label: "History" },
] as const;

type ServerTab = (typeof TABS)[number]["value"];

function RefreshConnectionButton({
  refreshing,
  onPress,
}: {
  refreshing: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const rotation = useSharedValue(0);
  const wasRefreshing = useRef(false);

  useEffect(() => {
    cancelAnimation(rotation);
    if (refreshing) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 850, easing: Easing.linear }),
        -1,
        false,
      );
    } else if (wasRefreshing.current) {
      const nextTurn = Math.ceil(rotation.value / 360) * 360;
      rotation.value = withTiming(nextTurn, { duration: 180, easing: Easing.out(Easing.quad) });
    } else {
      rotation.value = 0;
    }
    wasRefreshing.current = refreshing;
    return () => cancelAnimation(rotation);
  }, [refreshing, rotation]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Refresh current server connection"
      accessibilityState={{ disabled: refreshing }}
      style={[styles.refreshAction, { backgroundColor: palette.accentSoft }]}
      scaleTo={0.88}
      hitSlop={8}
      disabled={refreshing}
      onPress={onPress}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name="refresh" size={19} color={palette.accent} />
      </Animated.View>
    </PressableScale>
  );
}

export default function ServerScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);
  const serverHistory = useSettingsStore((s) => s.serverHistory);
  const removeServerHistory = useSettingsStore((s) => s.removeServerHistory);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearFolderTokens = useFolderTokenStore((s) => s.clearAll);
  const serverInfo = useServerInfo();
  const [tab, setTab] = useState<ServerTab>("connection");
  const [url, setUrl] = useState(currentUrl);
  const [steps, setSteps] = useState<ProbeStep[]>([]);
  const [probing, setProbing] = useState(false);
  const [reachable, setReachable] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [historySteps, setHistorySteps] = useState<ProbeStep[]>([]);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [historyProbing, setHistoryProbing] = useState(false);
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyProbeGen = useRef(0);

  const normalized = normalizeServerUrl(url);
  const unchanged = !normalized || normalized === normalizeServerUrl(currentUrl);
  const historyBusy = historyProbing;
  const canChange =
    !!normalized &&
    !unchanged &&
    reachable &&
    !probing &&
    !rechecking &&
    !historyBusy &&
    !switching &&
    !confirmedUrl;
  const recents = visibleServerHistory(serverHistory, currentUrl);

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

  const probeCandidate = async (target: string, onSteps: (next: ProbeStep[]) => void) => {
    const origin = normalizeServerUrl(target);
    if (!origin || origin === normalizeServerUrl(currentUrl) || switching) return null;
    const result = await probeServer(origin, onSteps);
    return result.status === "up" && result.url ? result.url : null;
  };

  const requestTypedSwitch = async () => {
    if (!normalized || !canChange) return;
    setRechecking(true);
    const next = await probeCandidate(normalized, setSteps);
    setRechecking(false);
    if (next) setConfirmedUrl(next);
    else setReachable(false);
  };

  const requestReconnect = async (target: string) => {
    const origin = normalizeServerUrl(target);
    if (!origin || origin === normalizeServerUrl(currentUrl) || switching || historyProbing || confirmedUrl) return;
    const gen = ++historyProbeGen.current;
    haptics.light();
    setHistoryTarget(origin);
    setHistoryProbing(true);
    setHistorySteps([]);
    const next = await probeCandidate(origin, (nextSteps) => {
      if (historyProbeGen.current === gen) setHistorySteps(nextSteps);
    });
    if (historyProbeGen.current !== gen) return;
    setHistoryProbing(false);
    if (!next) {
      haptics.error();
      toast.error("That server isn't reachable.");
      return;
    }
    haptics.success();
    setConfirmedUrl(next);
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
        toast.error("Couldn't change server.");
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
      : "Checking…";
  const refreshConnection = () => {
    if (serverInfo.isFetching) return;
    haptics.light();
    void serverInfo.refetch();
  };

  const selectTab = (next: ServerTab) => {
    if (next === tab) return;
    historyProbeGen.current += 1;
    setHistoryTarget(null);
    setHistoryProbing(false);
    setHistorySteps([]);
    setTab(next);
  };

  return (
    <SettingsPage title="Server">
      <View
        style={[
          styles.tabs,
          {
            paddingLeft: insets.left + spacing[16],
            paddingRight: insets.right + spacing[16],
          },
        ]}
      >
        <View style={styles.tabsInner}>
          <Segmented options={TABS} value={tab} onChange={selectTab} />
        </View>
      </View>

      <SettingsScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {tab === "connection" ? (
          <>
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
                right={
                  <RefreshConnectionButton
                    refreshing={serverInfo.isFetching}
                    onPress={refreshConnection}
                  />
                }
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
                  onPress={() => void requestTypedSwitch()}
                  style={styles.changeButton}
                />
              </SettingsForm>
            </SettingsGroup>
          </>
        ) : (
          <ServerHistoryPanel
            entries={recents}
            probingUrl={historyTarget}
            steps={historySteps}
            probing={historyProbing}
            busy={switching || rechecking || !!confirmedUrl}
            onReconnect={(target) => void requestReconnect(target)}
            onRemove={(target) => {
              haptics.light();
              removeServerHistory(target);
              if (historyTarget === target) {
                historyProbeGen.current += 1;
                setHistoryTarget(null);
                setHistoryProbing(false);
                setHistorySteps([]);
              }
            }}
            onChangeServer={() => selectTab("connection")}
          />
        )}
      </SettingsScrollView>

      <ConfirmDialog
        visible={!!confirmedUrl}
        onDismiss={() => setConfirmedUrl(null)}
        icon="log-out-outline"
        title="Switch server?"
        message="You'll be signed out and Ordo will restart."
        confirmLabel="Switch and restart"
        loading={switching}
        dismissible={!switching}
        onConfirm={() => void confirmSwitch()}
      >
        <View style={[styles.hostChange, { borderColor: palette.border }]}>
          <Text variant="monoSmall" color="tertiary" numberOfLines={1}>
            {hostOf(currentUrl)}
          </Text>
          <Ionicons name="arrow-down" size={14} color={palette.textTertiary} />
          <Text variant="monoSmall" numberOfLines={1}>
            {confirmedUrl ? hostOf(confirmedUrl) : ""}
          </Text>
        </View>
      </ConfirmDialog>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingTop: spacing[8], paddingBottom: spacing[4] },
  tabsInner: { width: "100%", maxWidth: layout.maxSettingsWidth, alignSelf: "center" },
  editor: { padding: spacing[16] },
  changeButton: { marginTop: spacing[16] },
  refreshAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hostChange: {
    padding: spacing[14],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    gap: spacing[8],
  },
});
