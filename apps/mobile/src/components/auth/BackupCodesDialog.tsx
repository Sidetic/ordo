import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { toast } from "../ui/toast-store";
import { downloadBackupCodes } from "../../lib/backup-codes-file";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

/**
 * One-time backup-code sheet. Closing discards the plaintext codes; the server
 * only keeps hashes, so they cannot be shown again.
 */
export function BackupCodesDialog({
  codes,
  onClose,
}: {
  codes: string[] | null;
  onClose: () => void;
}) {
  const { palette, shadows } = useTheme();
  const [saving, setSaving] = useState(false);
  const visible = !!codes?.length;

  const save = async () => {
    if (!codes?.length || saving) return;
    setSaving(true);
    try {
      await downloadBackupCodes(codes);
      haptics.success();
    } catch (e) {
      haptics.error();
      toast.error(errorMessage(e, "Couldn't save the codes."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} />
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
              <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}>
                <Ionicons name="key-outline" size={22} color={palette.accent} />
              </View>
              <Text variant="title1" align="center">
                Save your backup codes
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.copy}>
                Each code signs you in once. Download them now — they will not be shown again.
              </Text>
            </View>

            {codes ? (
              <View
                style={[
                  styles.grid,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                {codes.map((code) => (
                  <Text key={code} variant="mono" style={styles.code}>
                    {code}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button
                label="Download"
                variant="primary"
                size="lg"
                block
                loading={saving}
                onPress={() => void save()}
              />
              <Button label="Done" variant="ghost" block onPress={onClose} />
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
  grid: {
    marginTop: spacing[20],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    flexDirection: "row",
    flexWrap: "wrap",
  },
  code: {
    width: "50%",
    textAlign: "center",
    paddingVertical: spacing[6],
    letterSpacing: 0.4,
  },
  actions: { gap: spacing[4], marginTop: spacing[20] },
});
