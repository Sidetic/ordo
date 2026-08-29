/**
 * Centered title block for floating panels and dialogs.
 */
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, type TextVariant } from "./Text";
import { radius, spacing } from "../../theme/tokens";

export function PanelHeader({
  title,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  titleVariant = "title3",
  subtitleVariant = "footnote",
  numberOfLines,
  accessory,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  titleVariant?: TextVariant;
  subtitleVariant?: TextVariant;
  numberOfLines?: number;
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.titleCluster}>
        <Text variant={titleVariant} align="center" numberOfLines={numberOfLines} style={styles.title}>
          {title}
        </Text>
        {accessory}
      </View>
      {subtitle ? (
        <Text
          variant={subtitleVariant}
          color="secondary"
          align="center"
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: spacing[16],
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[12],
  },
  titleCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    alignSelf: "stretch",
  },
  title: { flexShrink: 1 },
  subtitle: { marginTop: spacing[4], maxWidth: 280, alignSelf: "center" },
});
