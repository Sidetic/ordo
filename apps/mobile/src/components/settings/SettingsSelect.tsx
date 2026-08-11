import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "../ui/Sheet";
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
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const usePopover = Platform.OS === "web" || width >= 600;
  const selected = options.find((option) => option.value === value) ?? options[0];

  const show = () => {
    haptics.selection();
    if (usePopover) {
      anchorRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
        setOpen(true);
      });
      return;
    }
    setOpen(true);
  };

  const choose = (next: T) => {
    haptics.selection();
    onChange(next);
    setOpen(false);
  };

  const choices = (
    <View accessibilityRole="menu">
      {options.map((option, index) => (
        <Pressable
          key={option.value}
          accessibilityRole="menuitem"
          onPress={() => choose(option.value)}
          style={({ pressed }) => [
            styles.option,
            index < options.length - 1 && { borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
            pressed && { backgroundColor: palette.surfaceSecondary },
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
  const estimatedHeight = options.length * 57;
  const menuTop = anchor.y + anchor.height + spacing[8] + estimatedHeight <= height - spacing[16]
    ? anchor.y + anchor.height + spacing[8]
    : Math.max(spacing[16], anchor.y - estimatedHeight - spacing[8]);

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${selected?.label ?? value}`}
          accessibilityState={{ expanded: open }}
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

      {usePopover ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
            <ScrollView
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
              ]}
              contentContainerStyle={styles.menuContent}
              bounces={false}
            >
              {choices}
            </ScrollView>
          </View>
        </Modal>
      ) : (
        <Sheet visible={open} onDismiss={() => setOpen(false)} maxFraction={0.65}>
          <Text variant="title2" style={styles.sheetTitle}>{title}</Text>
          {choices}
        </Sheet>
      )}
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
  menu: { position: "absolute", maxHeight: 360, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius["2xl"] },
  menuContent: { overflow: "hidden", borderRadius: radius["2xl"] },
  option: { minHeight: 57, flexDirection: "row", alignItems: "center", gap: spacing[12], paddingHorizontal: spacing[16] },
  optionLabel: { flex: 1 },
  sheetTitle: { marginBottom: spacing[8] },
});
