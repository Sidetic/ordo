/**
 * Animated toggle switch (Reanimated spring knob). AMOLED-aware.
 */
import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { springs } from "../../theme/tokens";

const TRACK_W = 46;
const TRACK_H = 28;
const KNOB = 22;
const PADDING = (TRACK_H - KNOB) / 2;
const TRAVEL = TRACK_W - KNOB - PADDING * 2;

export interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  const { palette } = useTheme();
  const pressed = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    pressed.value = withSpring(value ? 1 : 0, springs.snappy);
  }, [value, pressed]);

  const onToggle = useCallback(() => {
    if (disabled) return;
    haptics.selection();
    onValueChange(!value);
  }, [disabled, onValueChange, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value, [0, 1], [palette.surfaceSecondary, palette.accent]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pressed.value * TRAVEL }],
  }));

  return (
    <PressableScale scaleTo={0.92} dim={false} disabled={disabled} onPress={onToggle}>
      <View
        style={[styles.track, { opacity: disabled ? 0.5 : 1 }, trackStyle]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.knob, { backgroundColor: palette.surface }, knobStyle]} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, justifyContent: "center" },
  knob: {
    position: "absolute",
    left: PADDING,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
