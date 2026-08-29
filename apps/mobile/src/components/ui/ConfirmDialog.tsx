import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, type ButtonVariant } from "./Button";
import { Text } from "./Text";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export function ConfirmDialog({
  visible,
  onDismiss,
  icon,
  tone = "danger",
  title,
  message,
  children,
  confirmLabel,
  confirmVariant,
  onConfirm,
  loading = false,
  cancelLabel = "Cancel",
  dismissible = true,
}: {
  visible: boolean;
  onDismiss: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "danger" | "accent";
  title: string;
  message: string;
  children?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  loading?: boolean;
  cancelLabel?: string;
  dismissible?: boolean;
}) {
  const { palette, shadows } = useTheme();
  const canDismiss = dismissible && !loading;
  const iconBg = tone === "danger" ? palette.dangerSoft : palette.accentSoft;
  const iconColor = tone === "danger" ? palette.danger : palette.accent;
  const variant = confirmVariant ?? (tone === "danger" ? "danger" : "primary");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={canDismiss ? onDismiss : () => {}}
    >
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]}
          disabled={!canDismiss}
          onPress={onDismiss}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              ...shadows.level3,
            },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
              </View>
              <Text variant="title1" align="center">
                {title}
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.copy}>
                {message}
              </Text>
            </View>
            {children ? <View style={styles.extra}>{children}</View> : null}
            <View style={styles.actions}>
              <Button
                label={confirmLabel}
                variant={variant}
                size="lg"
                block
                loading={loading}
                onPress={onConfirm}
              />
              <Button
                label={cancelLabel}
                variant="ghost"
                block
                disabled={loading}
                onPress={onDismiss}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[20],
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "88%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius["3xl"],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    paddingBottom: spacing[16],
  },
  header: { alignItems: "center" },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[16],
  },
  copy: { marginTop: spacing[8], maxWidth: 280 },
  extra: { marginTop: spacing[16] },
  actions: { gap: spacing[4], marginTop: spacing[20] },
});
