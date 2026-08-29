/** About, build provenance, updates, and project links. */
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Badge } from "../../../src/components/ui/Badge";
import { OtaUpdateCard } from "../../../src/components/ui/OtaUpdater";
import { Toggle } from "../../../src/components/ui/Toggle";
import {
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { useBuildInfo } from "../../../src/hooks/use-build-info";
import { useOtaUpdate } from "../../../src/hooks/use-ota-update";
import { useNativeUpdateStore } from "../../../src/store/native-update";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { radius, spacing } from "../../../src/theme/tokens";

const REPO_URL = "https://github.com/axoletlabs/ordo";
const PUBLISHED_YEAR = 2026;

export default function AboutScreen() {
  const { palette } = useTheme();
  const build = useBuildInfo();
  const ota = useOtaUpdate();
  const nativeUpdate = useNativeUpdateStore();
  const commit = build.gitHashShort ?? build.gitHash ?? "—";
  const published = ota.runningUpdateCreatedAt;

  return (
    <SettingsPage title="About">
      <SettingsScrollView>
        <SettingsGroup
          label="Version"
          compact
          footer={build.gitDirty ? "Built from a working copy with uncommitted changes." : undefined}
        >
          <SettingRow icon="pricetag-outline" label="Version" description={`v${build.version}`} />
          <SettingRow icon="git-commit-outline" label="Commit" description={commit} divider={false} />
        </SettingsGroup>

        <SettingsGroup label="Running">
          <SettingRow
            icon="layers-outline"
            label="Origin"
            description={!ota.isEmbeddedLaunch && published ? `Published ${published.toLocaleDateString()}.` : undefined}
            right={
              <Badge tone={ota.isEmbeddedLaunch ? "neutral" : "blue"}>
                {ota.isEmbeddedLaunch ? "Embedded build" : "OTA update"}
              </Badge>
            }
          />
          <View style={styles.fingerprint}>
            <View
              style={[
                styles.fingerprintIcon,
                { backgroundColor: palette.surfaceSecondary, borderRadius: radius.sm },
              ]}
            >
              <Ionicons name="finger-print-outline" size={16} color={palette.accent} />
            </View>
            <View style={styles.fingerprintCopy}>
              <Text variant="body">Build fingerprint</Text>
              <Text
                variant="monoSmall"
                color="secondary"
                selectable
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={styles.fingerprintValue}
              >
                {ota.runtimeVersion ?? "—"}
              </Text>
            </View>
          </View>
        </SettingsGroup>

        <SettingsGroup label="Updates">
          <OtaUpdateCard />
          <SettingRow
            icon="flask-outline"
            label="Early access updates"
            description="Include preview app versions."
            right={
              <Toggle
                value={nativeUpdate.includePrereleases}
                disabled={nativeUpdate.status === "checking" || nativeUpdate.status === "downloading"}
                onValueChange={(enabled) => void nativeUpdate.setIncludePrereleases(enabled)}
              />
            }
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Links">
          <SettingRow
            icon="logo-github"
            label="Source"
            description="github.com/axoletlabs/ordo"
            onPress={() => Linking.openURL(REPO_URL).catch(() => {})}
            showChevron
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="License"
            description="AGPL-3.0"
            divider={false}
          />
        </SettingsGroup>

        <Text variant="caption" color="tertiary" align="center" style={styles.footer}>
          © {PUBLISHED_YEAR} Axolet Labs
        </Text>
      </SettingsScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  fingerprint: {
    minHeight: 64,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  fingerprintIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  fingerprintCopy: { flex: 1, minWidth: 0 },
  fingerprintValue: { marginTop: spacing[2] },
  footer: { marginTop: spacing[32] },
});
