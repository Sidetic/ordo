/**
 * Themed text input with label, helper/error text, and optional icon.
 */
import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  /** Right-aligned accessory (e.g. a "show password" toggle). */
  rightAccessory?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helper,
  icon,
  rightAccessory,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? palette.danger : focused ? palette.accent : palette.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="subhead" color="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          { backgroundColor: palette.surfaceSecondary, borderColor, borderRadius: radius.md },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={palette.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: palette.text }]}
          {...rest}
        />
        {rightAccessory ? <View style={styles.right}>{rightAccessory}</View> : null}
      </View>
      {error ? (
        <Text variant="footnote" color="danger" style={styles.msg}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="footnote" color="tertiary" style={styles.msg}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing[6] },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: spacing[14],
    minHeight: 48,
  },
  icon: { marginRight: spacing[8] },
  input: { flex: 1, paddingVertical: spacing[12], fontSize: 15 },
  right: { marginLeft: spacing[8] },
  msg: { marginTop: spacing[6] },
});
