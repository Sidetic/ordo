/** About, build provenance, updates, and project links. */
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Badge } from "../../../src/components/ui/Badge";
import { OtaUpdateCard } from "../../../src/components/ui/OtaUpdater";
import {
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { useBuildInfo } from "../../../src/hooks/use-build-info";
import { useOtaUpdate } from "../../../src/hooks/use-ota-update";
import { spacing } from "../../../src/theme/tokens";

const REPO_URL = "https://github.com/axoletlabs/ordo";
const PUBLISHED_YEAR = 2026;

export default function AboutScreen() {
  const build = useBuildInfo();
  const ota = useOtaUpdate();
  const commit = build.gitHashShort ?? build.gitHash ?? "—";
  const published = ota.runningUpdateCreatedAt;

  return (
    <SettingsPage title="About">
      <SettingsScrollView>
        <View style={styles.hero}>
          <Text variant="callout" align="center" style={styles.tagline}>
            The app that keeps your life in order
          </Text>
        </View>

        <SettingsGroup
          label="Version"
          compact
          footer={build.gitDirty ? "Built from a working copy with uncommitted changes." : undefined}
        >
          <SettingRow icon="pricetag-outline" label="Version" value={`v${build.version}`} />
          <SettingRow icon="git-commit-outline" label="Commit" value={commit} divider={false} />
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
            <View style={styles.fingerprintCopy}>
              <Text variant="body">Build fingerprint</Text>
              <Text variant="footnote" color="tertiary">Compatibility key for over-the-air updates.</Text>
            </View>
            <Text variant="monoSmall" color="secondary" selectable numberOfLines={2} style={styles.fingerprintValue}>
              {ota.runtimeVersion ?? "—"}
            </Text>
          </View>
        </SettingsGroup>

        <SettingsGroup label="Updates">
          <OtaUpdateCard />
        </SettingsGroup>

        <SettingsGroup label="Links">
          <SettingRow
            icon="logo-github"
            label="Source"
            description="github.com/axoletlabs/ordo"
            onPress={() => Linking.openURL(REPO_URL).catch(() => {})}
            showChevron
          />
          <SettingRow icon="shield-checkmark-outline" label="License" value="AGPL-3.0" divider={false} />
        </SettingsGroup>

        <Text variant="caption" color="tertiary" align="center" style={styles.footer}>
          © {PUBLISHED_YEAR} Axolet Labs
        </Text>
      </SettingsScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing[28], paddingTop: spacing[12] },
  tagline: { maxWidth: 300, alignSelf: "center", lineHeight: 21 },
  fingerprint: {
    minHeight: 76,
    padding: spacing[16],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  fingerprintCopy: { flex: 1 },
  fingerprintValue: { maxWidth: "45%", textAlign: "right" },
  footer: { marginTop: spacing[32] },
});
