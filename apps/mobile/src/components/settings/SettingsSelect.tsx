import React from "react";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../ui/Text";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface SettingsSelectOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  title,
}: {
  value: T;
  options: readonly SettingsSelectOption<T>[];
  onChange: (value: T) => void;
  title: string;
}) {
  const { palette, shadows } = useTheme();
  const { width, height } = useWindowDimensions();
  const anchorRef = React.useRef<View>(null);
  const progress = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(false);
  const [anchor, setAnchor] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const [hovered, setHovered] = React.useState<T | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const show = () => {
    haptics.selection();
    Keyboard.dismiss();
    setTimeout(
      () => {
        anchorRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
          setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
          setMounted(true);
          progress.setValue(0);
          requestAnimationFrame(() => {
            Animated.spring(progress, {
              toValue: 1,
              damping: 22,
              stiffness: 260,
              mass: 0.75,
              useNativeDriver: true,
            }).start();
          });
        });
      },
      Platform.OS === "web" ? 0 : 160,
    );
  };

  const dismiss = React.useCallback(() => {
    setHovered(null);
    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progress]);

  const choose = (next: T) => {
    haptics.selection();
    onChange(next);
    dismiss();
  };

  const choices = (
    <View accessibilityRole="menu">
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="menuitem"
          accessibilityState={{ selected: option.value === value }}
          onHoverIn={() => setHovered(option.value)}
          onHoverOut={() => setHovered(null)}
          onPress={() => choose(option.value)}
          style={({ pressed }) => [
            styles.option,
            (pressed || hovered === option.value) && {
              backgroundColor: palette.surfaceSecondary,
            },
          ]}
        >
          {option.icon ? <Ionicons name={option.icon} size={20} color={palette.textTertiary} /> : null}
          <Text variant="body" style={styles.optionLabel}>{option.label}</Text>
          {option.value === value ? <Ionicons name="checkmark" size={21} color={palette.accent} /> : null}
        </Pressable>
      ))}
    </View>
  );

  const menuWidth = Math.min(300, width - spacing[32]);
  const menuLeft = Math.min(Math.max(spacing[16], anchor.x + anchor.width - menuWidth), width - menuWidth - spacing[16]);
  const estimatedHeight = options.length * 56 + spacing[12];
  const menuTop = anchor.y + anchor.height + spacing[8] + estimatedHeight <= height - spacing[16]
    ? anchor.y + anchor.height + spacing[8]
    : Math.max(spacing[16], anchor.y - estimatedHeight - spacing[8]);
  const menuAnimation = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  };

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${selected?.label ?? value}`}
          accessibilityState={{ expanded: mounted }}
          onPress={show}
          style={({ pressed }) => [
            styles.trigger,
            { borderColor: palette.borderStrong, backgroundColor: palette.surfaceSecondary },
            pressed && styles.pressed,
          ]}
        >
          {selected?.icon ? <Ionicons name={selected.icon} size={18} color={palette.textTertiary} /> : null}
          <Text variant="footnote" numberOfLines={1}>{selected?.shortLabel ?? selected?.label ?? value}</Text>
          <Ionicons name="chevron-down" size={16} color={palette.textTertiary} />
        </Pressable>
      </View>

      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
          <Animated.View
            style={[
              styles.menu,
              {
                left: menuLeft,
                top: menuTop,
                width: menuWidth,
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.borderStrong,
                ...shadows.level3,
              },
              menuAnimation,
            ]}
          >
            {choices}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 42,
    maxWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  pressed: { opacity: 0.72 },
  modalRoot: { flex: 1 },
  menu: {
    position: "absolute",
    maxHeight: 360,
    padding: spacing[6],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius["2xl"],
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[14],
    borderRadius: radius.lg,
  },
  optionLabel: { flex: 1 },
});
