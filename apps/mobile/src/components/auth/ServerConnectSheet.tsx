/**
 * Terminal-style "Connect to server" sheet, faithful to ordo-archive.
 *
 * A monospace health-check log runs a live 2-step probe (connect → /api/server/info)
 * as the user types (debounced). The Change button stays disabled until the probe
 * reports `up`; clicking it runs one quick re-probe, then commits.
 *
 * Crucially, the probe runs in isolation and NEVER mutates the global server-URL
 * store — only the final commit does. (The previous version mutated the store to
 * probe, which is what broke Save / reset the URL.)
 */
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "../ui/Sheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { terminalPalette } from "../../theme/theme";
import { radius, spacing } from "../../theme/tokens";
import { resolveFont } from "../../theme/tokens";
import { useSettingsStore } from "../../store/settings";
import {
  hostOf,
  normalizeServerUrl,
  probeServer,
  type ProbeStep,
  type ProbeStepState,
} from "../../lib/server-probe";

function BlinkingCursor() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 420 }), withTiming(1, { duration: 420 })),
      -1,
    );
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.Text style={[styles.cursor, { fontFamily: resolveFont("mono", "400") }, s]}>{">"}</Animated.Text>
  );
}

function stepColor(state: ProbeStepState): string {
  switch (state) {
    case "success":
      return terminalPalette.green;
    case "failure":
      return terminalPalette.coral;
    default:
      return terminalPalette.teal;
  }
}

function suffixFor(step: ProbeStep): string | null {
  switch (step.state) {
    case "pending":
      return "...";
    case "success": {
      const parts: string[] = ["ok"];
      if (step.detail) parts.push(step.detail);
      if (step.latencyMs != null) parts.push(`${step.latencyMs}ms`);
      return parts.join(" · ");
    }
    case "failure":
      return step.detail ? `fail · ${step.detail}` : "fail";
  }
}

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
  const [steps, setSteps] = useState<ProbeStep[]>([]);
  const [probing, setProbing] = useState(false);
  const [up, setUp] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset only when the sheet opens (NOT on currentUrl changes).
  useEffect(() => {
    if (visible) {
      setUrl(currentUrl);
      setSteps([]);
      setProbing(false);
      setUp(false);
      setConfirming(false);
    }
  }, [visible]);

  // Debounced probe whenever the (normalised) URL changes.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const normalized = normalizeServerUrl(url);
    if (!normalized || normalized === normalizeServerUrl(currentUrl)) {
      setSteps([]);
      setUp(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (cancelled) return;
      setProbing(true);
      setUp(false);
      void probeServer(url, (s) => {
        if (!cancelled) setSteps(s);
      }).then((r) => {
        if (cancelled) return;
        setProbing(false);
        setUp(r.status === "up");
      });
    }, 900);
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url, visible, currentUrl]);

  const normalized = normalizeServerUrl(url);
  const isUnchanged = !normalized || normalized === normalizeServerUrl(currentUrl);
  const canChange = !!normalized && !isUnchanged && up && !probing && !confirming;

  const onChange = async () => {
    if (!normalized || !canChange) return;
    setConfirming(true);
    const recheck = await probeServer(normalized);
    setConfirming(false);
    if (recheck.status === "up" && recheck.url) {
      setServerUrl(recheck.url);
      onDismiss();
      onSaved?.();
    } else {
      // Refresh the log to show the failure detail.
      setUp(false);
      void probeServer(normalized, (s) => setSteps(s));
    }
  };

  return (
    <Sheet visible={visible} onDismiss={confirming ? () => {} : onDismiss}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: "rgba(79,125,166,0.14)", borderRadius: radius.lg }]}>
          <Ionicons name="cloud-outline" size={20} color={palette.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title2">Server URL</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
            A health check runs before you switch.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing[16] }}>
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="http://localhost:3000"
          mono
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          icon={<Ionicons name="link" size={15} color={palette.textTertiary} />}
        />
      </View>

      {/* Terminal log */}
      {!isUnchanged ? (
        <View style={[styles.terminal, { backgroundColor: terminalPalette.bg, borderColor: palette.border }]}>
          {steps.length === 0 ? (
            <Text
              style={{
                fontFamily: resolveFont("mono", "400"),
                fontSize: 11.5,
                color: terminalPalette.mute,
              }}
            >
              {"> awaiting url..."}
            </Text>
          ) : (
            steps.map((step, i) => {
              const suffix = suffixFor(step);
              return (
                <View key={i} style={styles.termLine}>
                  <Text
                    style={{
                      fontFamily: resolveFont("mono", "400"),
                      fontSize: 11.5,
                      color: terminalPalette.mute,
                    }}
                  >
                    {">"}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: resolveFont("mono", "400"),
                      fontSize: 11.5,
                      color: terminalPalette.text,
                    }}
                    numberOfLines={1}
                  >
                    {step.command}
                  </Text>
                  {suffix ? (
                    <Text
                      style={{
                        fontFamily: resolveFont("mono", "600"),
                        fontSize: 11.5,
                        color: stepColor(step.state),
                      }}
                      numberOfLines={1}
                    >
                      {suffix}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
          {probing ? (
            <View style={[styles.termLine, { marginTop: 2 }]}>
              <BlinkingCursor />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Current hint */}
      {!isUnchanged && currentUrl ? (
        <View style={styles.currentRow}>
          <Ionicons name="time-outline" size={11} color={palette.textTertiary} />
          <Text variant="monoSmall" color="tertiary" numberOfLines={1} style={{ flex: 1 }}>
            Current: {hostOf(currentUrl)}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Button label="Close" variant="secondary" onPress={onDismiss} disabled={confirming} />
        <View style={{ width: spacing[10] }} />
        <View style={{ flex: 2 }}>
          <Button
            label={confirming ? "" : "Change"}
            variant="primary"
            onPress={onChange}
            disabled={!canChange}
            loading={confirming}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing[12] },
  headerIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  terminal: {
    marginTop: spacing[14],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 64,
  },
  termLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 1 },
  cursor: { fontSize: 12, color: terminalPalette.teal, marginTop: 2 },
  currentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing[10] },
  actions: { flexDirection: "row", alignItems: "center", marginTop: spacing[20] },
});
