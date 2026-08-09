/**
 * About — identity, build origin, and the OTA update card.
 *
 * Build facts (version, commit) come from useBuildInfo (stamped at build time
 * via app.config.js); runtime/OTA facts (embedded vs OTA, fingerprint, channel)
 * and update actions come from useOtaUpdate.
 */
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Badge } from "../../../src/components/ui/Badge";
import { OtaUpdateCard } from "../../../src/components/ui/OtaUpdater";
import {
  SettingsPage,
  SettingsScrollView,
  SettingsSectionLabel,
} from "../../../src/components/settings/SettingsPage";
import { useBuildInfo } from "../../../src/hooks/use-build-info";
import { useOtaUpdate } from "../../../src/hooks/use-ota-update";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing } from "../../../src/theme/tokens";

const REPO_URL = "https://github.com/axoletlabs/ordo";
const PUBLISHED_YEAR = 2026;

export default function AboutScreen() {
  const { palette } = useTheme();
  const build = useBuildInfo();
  const ota = useOtaUpdate();

  const commit = build.gitHashShort ?? build.gitHash ?? "—";
  const fingerprint = ota.runtimeVersion;
  const published = ota.runningUpdateCreatedAt;

  return (
    <SettingsPage title="About">
      <SettingsScrollView>
        <View style={styles.hero}>
          <Text variant="callout" align="center" style={styles.tagline}>
            The app that keeps your life in order
          </Text>
        </View>

        {/* Version */}
        <SettingsSectionLabel compact>Version</SettingsSectionLabel>
        <SettingRow icon="pricetag-outline" label="Version" value={`v${build.version}`} />
        <SettingRow icon="git-commit-outline" label="Commit" value={commit} divider={!build.gitDirty} />
        {build.gitDirty ? (
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Built from a working copy with uncommitted changes.
          </Text>
        ) : null}

        {/* Running */}
        <SettingsSectionLabel>Running</SettingsSectionLabel>
        <View style={styles.originRow}>
          <Text variant="body">Origin</Text>
          <Badge tone={ota.isEmbeddedLaunch ? "neutral" : "blue"}>
            {ota.isEmbeddedLaunch ? "Embedded build" : "OTA update"}
          </Badge>
        </View>
        {!ota.isEmbeddedLaunch && published ? (
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Published {published.toLocaleDateString()}.
          </Text>
        ) : null}

        {/* Build fingerprint */}
        <SettingsSectionLabel>Build fingerprint</SettingsSectionLabel>
        <View style={styles.fpWrap}>
          <View style={[styles.fpBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text variant="mono" selectable style={{ color: palette.textSecondary }}>
              {fingerprint ?? "—"}
            </Text>
          </View>
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Compatibility key for over-the-air updates.
          </Text>
        </View>

        {/* Updates */}
        <SettingsSectionLabel>Updates</SettingsSectionLabel>
        <View style={styles.updatesWrap}>
          <OtaUpdateCard />
        </View>

        {/* Links */}
        <SettingsSectionLabel>Links</SettingsSectionLabel>
        <SettingRow
          icon="logo-github"
          label="Source"
          value="github.com/axoletlabs/ordo"
          onPress={() => Linking.openURL(REPO_URL).catch(() => {})}
          showChevron
        />
        <SettingRow icon="shield-checkmark-outline" label="License" value="AGPL-3.0" divider={false} />

        <Text variant="caption" color="tertiary" align="center" style={styles.footer}>
          © {PUBLISHED_YEAR} Axolet Labs
        </Text>
      </SettingsScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing[28], paddingTop: spacing[8] },
  tagline: { maxWidth: 300, alignSelf: "center", lineHeight: 21 },
  helper: { paddingHorizontal: spacing[20], paddingTop: spacing[8] },
  originRow: { paddingHorizontal: spacing[20], paddingVertical: spacing[12], flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fpWrap: { paddingHorizontal: spacing[16], paddingTop: spacing[4] },
  fpBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: spacing[14], paddingVertical: spacing[12] },
  updatesWrap: { paddingHorizontal: spacing[12], paddingTop: spacing[4] },
  footer: { marginTop: spacing[32] },
});
