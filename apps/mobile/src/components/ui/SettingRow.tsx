/** A setting list row: icon chip + label + value/chevron, or trailing control. */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface SettingRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
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
  description,
  value,
  onPress,
  right,
  destructive,
  showChevron,
  divider = true,
}: SettingRowProps) {
  const { palette } = useTheme();
  const tint = destructive ? palette.danger : palette.accent;
  const valueColor = destructive ? palette.danger : palette.textTertiary;

  const content = (
    <View style={[styles.row, { borderBottomColor: palette.border }, !divider && styles.noDivider]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary, borderRadius: radius.sm }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text variant="body" style={{ color: destructive ? palette.danger : palette.text }}>{label}</Text>
        {description ? (
          <Text variant="footnote" color="tertiary" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="footnote" color="tertiary" numberOfLines={1} style={[styles.value, { color: valueColor }]}>
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Ionicons name="chevron-forward" size={16} color={palette.textFaint} /> : null}
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
  pad: { width: "100%" },
  press: { borderRadius: radius.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 64,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noDivider: { borderBottomWidth: 0 },
  iconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  description: { marginTop: spacing[2] },
  value: { maxWidth: 150 },
});
