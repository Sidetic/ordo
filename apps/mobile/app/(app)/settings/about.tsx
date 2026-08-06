/**
 * About — identity, build origin, and the OTA update card.
 *
 * Build facts (version, commit) come from useBuildInfo (stamped at build time
 * via app.config.js); runtime/OTA facts (embedded vs OTA, fingerprint, channel)
 * and update actions come from useOtaUpdate.
 */
import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../../src/components/ui/Header";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { Badge } from "../../../src/components/ui/Badge";
import { OtaUpdateCard } from "../../../src/components/ui/OtaUpdater";
import { useBuildInfo } from "../../../src/hooks/use-build-info";
import { useOtaUpdate } from "../../../src/hooks/use-ota-update";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing } from "../../../src/theme/tokens";

const REPO_URL = "https://github.com/axoletlabs/ordo";
const PUBLISHED_YEAR = 2026;

function SectionLabel({ children, compact }: { children: string; compact?: boolean }) {
  return (
    <Text variant="caption" color="secondary" style={[styles.sectionLabel, compact && styles.compactSectionLabel]}>
      {children.toUpperCase()}
    </Text>
  );
}

export default function AboutScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const build = useBuildInfo();
  const ota = useOtaUpdate();

  const commit = build.gitHashShort ?? build.gitHash ?? "—";
  const fingerprint = ota.runtimeVersion;
  const published = ota.runningUpdateCreatedAt;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="About" showBack onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[40] }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text variant="callout" align="center" style={styles.tagline}>
            The app that keeps your life in order
          </Text>
        </View>

        {/* Version */}
        <SectionLabel compact>Version</SectionLabel>
        <SettingRow icon="pricetag-outline" label="Version" value={`v${build.version}`} />
        <SettingRow icon="git-commit-outline" label="Commit" value={commit} divider={!build.gitDirty} />
        {build.gitDirty ? (
          <Text variant="caption" color="tertiary" style={styles.helper}>
            Built from a working copy with uncommitted changes.
          </Text>
        ) : null}

        {/* Running */}
        <SectionLabel>Running</SectionLabel>
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
        <SectionLabel>Build fingerprint</SectionLabel>
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
        <SectionLabel>Updates</SectionLabel>
        <View style={styles.updatesWrap}>
          <OtaUpdateCard />
        </View>

        {/* Links */}
        <SectionLabel>Links</SectionLabel>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing[28], paddingTop: spacing[16] },
  tagline: { maxWidth: 300, alignSelf: "center", lineHeight: 21 },
  sectionLabel: { paddingHorizontal: spacing[20], paddingTop: spacing[24], paddingBottom: spacing[8] },
  compactSectionLabel: { paddingTop: spacing[16] },
  helper: { paddingHorizontal: spacing[20], paddingTop: spacing[8] },
  originRow: { paddingHorizontal: spacing[20], paddingVertical: spacing[12], flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fpWrap: { paddingHorizontal: spacing[16], paddingTop: spacing[4] },
  fpBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: spacing[14], paddingVertical: spacing[12] },
  updatesWrap: { paddingHorizontal: spacing[12], paddingTop: spacing[4] },
  footer: { marginTop: spacing[32] },
});
