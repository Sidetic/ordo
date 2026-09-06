import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { spacing } from "../../theme/tokens";

export function SheetActionRow({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const color = tone === "danger" ? palette.danger : palette.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, { borderBottomColor: palette.border }]}
      onPress={() => {
        haptics.light();
        onPress();
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="body" style={[styles.label, { color }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 46,
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1 },
});
