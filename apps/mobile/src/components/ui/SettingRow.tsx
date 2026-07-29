/**
 * A setting list row: icon + label + value/chevron, or a trailing control.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";

export interface SettingRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  divider?: boolean;
}

export function SettingRow({
  icon,
  label,
  value,
  onPress,
  right,
  destructive,
  showChevron,
  divider = true,
}: SettingRowProps) {
  const { palette } = useTheme();
  const tint = destructive ? palette.danger : palette.accent;

  const content = (
    <View style={[styles.row, { borderBottomColor: palette.border }, !divider && styles.noDivider]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text variant="body" style={{ color: destructive ? palette.danger : palette.text }}>{label}</Text>
      </View>
      {value ? <Text variant="footnote" color="secondary" numberOfLines={1} style={styles.value}>{value}</Text> : null}
      {right}
      {showChevron ? <Ionicons name="chevron-forward" size={16} color={palette.textTertiary} /> : null}
    </View>
  );

  if (!onPress) return <View style={styles.pad}>{content}</View>;
  return (
    <View style={styles.pad}>
      <PressableScale style={styles.press} dim onPress={onPress}>
        {content}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing[16] },
  press: { borderRadius: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], paddingVertical: spacing[12], borderBottomWidth: StyleSheet.hairlineWidth },
  noDivider: { borderBottomWidth: 0 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  value: { maxWidth: 140 },
});
