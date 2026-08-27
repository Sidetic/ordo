/**
 * Compact Email / Server console tabs for OTP screens, plus a one-time
 * dismissible tip when codes land in the process console (no SMTP).
 * Mailpit is mentioned as an optional fake inbox — never required.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { useSettingsStore } from "../../store/settings";
import { radius, spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";

export function OtpDeliveryHint({
  smtpConfigured,
}: {
  smtpConfigured: boolean | undefined;
}) {
  const { palette } = useTheme();
  const dismissed = useSettingsStore((s) => s.consoleOtpTipDismissed);
  const dismiss = useSettingsStore((s) => s.dismissConsoleOtpTip);
  const consoleMode = smtpConfigured === false;

  if (smtpConfigured !== true && smtpConfigured !== false) return null;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.tabs,
          {
            backgroundColor: palette.surfaceSecondary,
            borderColor: palette.border,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={
          consoleMode
            ? "One-time codes are printed in the server console"
            : "One-time codes are sent by email"
        }
      >
        <DeliveryTab
          label="Email"
          icon="mail-outline"
          selected={!consoleMode}
        />
        <DeliveryTab
          label="Server console"
          icon="terminal-outline"
          selected={consoleMode}
        />
      </View>

      {consoleMode && !dismissed ? (
        <View
          style={[
            styles.tip,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.tipHeader}>
            <Text variant="subhead" style={{ flex: 1 }}>
              Codes print here
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Dismiss console OTP tip"
              hitSlop={8}
              onPress={() => {
                haptics.light();
                dismiss();
              }}
              style={styles.dismiss}
            >
              <Text variant="label" color="accent">
                Got it
              </Text>
            </PressableScale>
          </View>
          <Text variant="footnote" color="secondary">
            SMTP isn't configured, so one-time codes are printed in the server
            console. Point SMTP_URL at Mailpit (or any fake SMTP) if you'd rather
            catch them in an inbox — that's optional.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DeliveryTab({
  label,
  icon,
  selected,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.tab,
        selected && {
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.borderStrong,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={13}
        color={selected ? palette.accent : palette.textTertiary}
      />
      <Text
        variant="caption"
        color={selected ? "primary" : "tertiary"}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[10] },
  tabs: {
    flexDirection: "row",
    padding: 3,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[8],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tip: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[12],
    gap: spacing[6],
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  dismiss: { paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
});
