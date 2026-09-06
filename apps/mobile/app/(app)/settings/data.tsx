/** Data: export the library to a file, import from Ordo/HTML/CSV exports. */
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { ExportFormat, FolderDto } from "@ordo/shared";
import { TOKEN_TTL } from "@ordo/shared";
import { SettingsPage, SettingsScrollView, SettingsGroup } from "../../../src/components/settings/SettingsPage";
import { ImportFlow } from "../../../src/components/settings/ImportFlow";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Segmented } from "../../../src/components/ui/Segmented";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { LockPrompt } from "../../../src/components/bookmarks/LockPrompt";
import { toast } from "../../../src/components/ui/toast-store";
import { useFolders } from "../../../src/hooks/use-folders";
import { useFolderTokenStore } from "../../../src/store/folder-tokens";
import { importExportApi } from "../../../src/lib/api/import-export";
import {
  downloadExportFile,
  filenameFromDisposition,
  isExportSaveCanceled,
  mimeForExportFormat,
} from "../../../src/lib/import-export-file";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing } from "../../../src/theme/tokens";

const FORMAT_OPTIONS: ReadonlyArray<{ value: ExportFormat; label: string }> = [
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "csv", label: "CSV" },
];

const FORMAT_HINTS: Record<ExportFormat, string> = {
  json: "Everything — folders, tags, and read state. Best for Ordo backups and moving servers.",
  html: "The browser bookmark format. Best for importing into Chrome, Firefox, or Safari.",
  csv: "Plain columns, one bookmark per row. Best for spreadsheets and Raindrop.io.",
};

export default function DataScreen() {
  const { palette } = useTheme();
  const { data: folders = [] } = useFolders();

  const accessRevision = useFolderTokenStore((s) => s.accessRevision);
  const tokenFor = (id: string) => {
    void accessRevision;
    return useFolderTokenStore.getState().get(id);
  };

  const [format, setFormat] = useState<ExportFormat>("json");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ folder: FolderDto; source: "export" | "import" } | null>(
    null,
  );

  const isLibrary = selectedFolderIds.length === 0;
  const protectedFolders = useMemo(() => folders.filter((f) => f.protected), [folders]);

  const tokensFor = (ids: string[]): string[] =>
    ids.map((id) => tokenFor(id)).filter((t): t is string => Boolean(t));

  const lockedInScope = isLibrary
    ? protectedFolders.filter((f) => !tokenFor(f.id))
    : protectedFolders.filter((f) => selectedFolderIds.includes(f.id) && !tokenFor(f.id));

  const radio = (selected: boolean) => (
    <Ionicons
      name={selected ? "checkmark-circle" : "ellipse-outline"}
      size={22}
      color={selected ? palette.accent : palette.textFaint}
    />
  );

  const check = (selected: boolean) => (
    <Ionicons
      name={selected ? "checkbox" : "square-outline"}
      size={22}
      color={selected ? palette.accent : palette.textFaint}
    />
  );

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const exportLabel = (() => {
    const fmt = format.toUpperCase();
    if (isLibrary) return more ? `Export library as ${fmt}` : "Export library";
    if (selectedFolderIds.length === 1) {
      const name =
        folders.find((f) => f.id === selectedFolderIds[0])?.name.split(" / ").pop() ?? "folder";
      return more ? `Export ${name} as ${fmt}` : `Export ${name}`;
    }
    return more
      ? `Export ${selectedFolderIds.length} folders as ${fmt}`
      : `Export ${selectedFolderIds.length} folders`;
  })();

  const exportFooter = more
    ? lockedInScope.length > 0
      ? isLibrary
        ? `Excluded until unlocked: ${lockedInScope.map((f) => f.name).join(", ")}.`
        : lockedInScope.length === 1
          ? "This folder is locked. Unlock it, then export."
          : "Unlock locked folders, then export."
      : isLibrary
        ? undefined
        : "Unfiled bookmarks aren't included when you pick folders."
    : "JSON backup of your library. Open More for HTML, CSV, or specific folders.";

  const exportMutation = useMutation({
    mutationFn: async () => {
      const tokens = tokensFor(isLibrary ? protectedFolders.map((f) => f.id) : selectedFolderIds);
      const res = await importExportApi.requestExport(format, selectedFolderIds, tokens);
      const filename = filenameFromDisposition(
        res.headers.get("content-disposition"),
        format === "json" ? "json" : format,
      );
      await downloadExportFile(await res.text(), filename, mimeForExportFormat(format));
    },
    onSuccess: () => {
      haptics.success();
      toast.success("Export saved");
    },
    onError: (err) => {
      if (isExportSaveCanceled(err)) return;
      toast.error(errorMessage(err, "The export failed."));
    },
  });

  return (
    <SettingsPage title="Data">
      <SettingsScrollView>
        <SettingsGroup label="Export" compact footer={exportFooter}>
          <View style={styles.pad}>
            <Button
              label={exportLabel}
              block
              size="lg"
              loading={exportMutation.isPending}
              onPress={() => exportMutation.mutate()}
            />
          </View>
          <SettingRow
            icon="ellipsis-horizontal"
            label="More options"
            description={more ? "Format and folders" : "HTML, CSV, or choose folders"}
            onPress={() => setMore((open) => !open)}
            value={more ? "Hide" : "Show"}
            divider={more}
          />
          {more ? (
            <>
              <Text variant="caption" color="secondary" style={styles.sectionCaption}>
                WHAT TO EXPORT
              </Text>
              <SettingRow
                icon="library-outline"
                label="Entire library"
                description="All folders below, plus unfiled bookmarks"
                right={radio(isLibrary)}
                onPress={() => setSelectedFolderIds([])}
              />
              {folders.map((folder, index) => {
                const unlocked = !folder.protected || Boolean(tokenFor(folder.id));
                const last = index === folders.length - 1;
                if (!unlocked) {
                  return (
                    <SettingRow
                      key={folder.id}
                      icon="lock-closed-outline"
                      label={folder.name}
                      description="Locked — excluded until unlocked"
                      value="Unlock"
                      onPress={() => setUnlockTarget({ folder, source: "export" })}
                      divider={!last}
                    />
                  );
                }
                return (
                  <SettingRow
                    key={folder.id}
                    icon={folder.protected ? "lock-open-outline" : "folder-outline"}
                    label={folder.name}
                    description={
                      folder.protected
                        ? `${folder.bookmarkCount} bookmarks · unlocked`
                        : `${folder.bookmarkCount} bookmarks`
                    }
                    right={check(selectedFolderIds.includes(folder.id))}
                    onPress={() => toggleFolder(folder.id)}
                    divider={!last}
                  />
                );
              })}
              <View style={styles.pad}>
                <Text variant="caption" color="secondary" style={styles.labelGap}>
                  FILE FORMAT
                </Text>
                <Segmented options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
                <Text variant="footnote" color="tertiary" style={styles.tightTop}>
                  {FORMAT_HINTS[format]}
                </Text>
              </View>
            </>
          ) : null}
        </SettingsGroup>

        <ImportFlow
          folders={folders}
          tokenFor={tokenFor}
          onUnlock={(folder) => setUnlockTarget({ folder, source: "import" })}
        />
      </SettingsScrollView>

      <LockPrompt
        visible={unlockTarget !== null}
        folderId={unlockTarget?.folder.id ?? ""}
        folderName={unlockTarget?.folder.name}
        lockType={unlockTarget?.folder.lockType ?? "password"}
        pinLength={unlockTarget?.folder.pinLength}
        onDismiss={() => setUnlockTarget(null)}
        onUnlocked={() => {
          const target = unlockTarget;
          setUnlockTarget(null);
          if (target?.source === "export") {
            setSelectedFolderIds((current) =>
              current.includes(target.folder.id) ? current : [...current, target.folder.id],
            );
          }
          toast.success(`Folder unlocked for ${Math.round(TOKEN_TTL.FOLDER_MS / 60_000)} minutes`);
        }}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing[16] },
  tightTop: { marginTop: spacing[4] },
  labelGap: { marginBottom: spacing[8] },
  sectionCaption: { paddingTop: spacing[8], paddingHorizontal: spacing[16] },
});
