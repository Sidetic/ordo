import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { terminalPalette } from "../../theme/theme";
import { radius, resolveFont, spacing } from "../../theme/tokens";
import type { ProbeStep, ProbeStepState } from "../../lib/server-probe";

function BlinkingCursor() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 420 }), withTiming(1, { duration: 420 })),
      -1,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[styles.cursor, { fontFamily: resolveFont("mono", "400") }, style]}>
      {">"}
    </Animated.Text>
  );
}

function stepColor(state: ProbeStepState): string {
  if (state === "success") return terminalPalette.green;
  if (state === "failure") return terminalPalette.coral;
  return terminalPalette.teal;
}

function suffixFor(step: ProbeStep): string {
  if (step.state === "pending") return "...";
  if (step.state === "failure") return step.detail ? `fail - ${step.detail}` : "fail";

  const parts = ["ok"];
  if (step.detail) parts.push(step.detail);
  if (step.latencyMs != null) parts.push(`${step.latencyMs}ms`);
  return parts.join(" - ");
}

export function ServerProbeLog({
  steps,
  probing,
  style,
}: {
  steps: ProbeStep[];
  probing: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.terminal, { backgroundColor: terminalPalette.bg, borderColor: palette.border }, style]}>
      {steps.length === 0 ? (
        <Text style={styles.awaiting}>{"> awaiting url..."}</Text>
      ) : (
        steps.map((step, index) => (
          <View key={`${step.command}-${index}`} style={styles.line}>
            <Text style={styles.prompt}>{">"}</Text>
            <Text style={styles.command} numberOfLines={1}>
              {step.command}
            </Text>
            <Text style={[styles.suffix, { color: stepColor(step.state) }]} numberOfLines={1}>
              {suffixFor(step)}
            </Text>
          </View>
        ))
      )}
      {probing ? (
        <View style={[styles.line, styles.cursorLine]}>
          <BlinkingCursor />
        </View>
      ) : null}
    </View>
  );
}

const mono = { fontFamily: resolveFont("mono", "400"), fontSize: 11.5 };

const styles = StyleSheet.create({
  terminal: {
    marginTop: spacing[14],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 64,
  },
  line: { flexDirection: "row", alignItems: "center", gap: spacing[8], paddingVertical: 1 },
  cursorLine: { marginTop: spacing[2] },
  cursor: { fontSize: 12, color: terminalPalette.teal, marginTop: spacing[2] },
  awaiting: { ...mono, color: terminalPalette.mute },
  prompt: { ...mono, color: terminalPalette.mute },
  command: { ...mono, flex: 1, color: terminalPalette.text },
  suffix: { fontFamily: resolveFont("mono", "600"), fontSize: 11.5 },
});
