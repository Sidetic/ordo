import { StyleSheet, View } from "react-native";
import { PressableScale } from "../ui/PressableScale";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme/ThemeProvider";
import { haptics } from "../../lib/haptics";
import { radius, spacing } from "../../theme/tokens";

export function PatternInput({ value, onChange }: { value: number[]; onChange: (value: number[]) => void }) {
  const { palette } = useTheme();

  const toggle = (node: number) => {
    if (value.includes(node)) return;
    haptics.selection();
    onChange([...value, node]);
  };

  return (
    <View>
      <View style={styles.grid} accessibilityLabel="Pattern grid">
        {Array.from({ length: 9 }, (_, node) => {
          const order = value.indexOf(node);
          const selected = order >= 0;
          return (
            <PressableScale
              key={node}
              accessibilityRole="button"
              accessibilityLabel={`Pattern dot ${node + 1}${selected ? `, selected ${order + 1}` : ""}`}
              onPress={() => toggle(node)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: selected ? palette.accent : palette.surfaceSecondary,
                    borderColor: selected ? palette.accent : palette.border,
                  },
                ]}
              >
                {selected ? <Text variant="footnote" style={{ color: palette.onAccent }}>{order + 1}</Text> : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <PressableScale accessibilityRole="button" onPress={() => onChange([])} style={styles.clear}>
        <Text variant="footnote" color="accent">Clear pattern</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { width: 210, alignSelf: "center", flexDirection: "row", flexWrap: "wrap" },
  cell: { width: 70, height: 64, alignItems: "center", justifyContent: "center" },
  dot: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: { alignSelf: "center", padding: spacing[8] },
});
