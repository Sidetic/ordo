/** Data: export the library to a file, import from Ordo/HTML/CSV exports. */
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DuplicatePolicy, ExportFormat, FolderDto, ImportJobDto } from "@ordo/shared";
import { IMPORT_EXPORT } from "@ordo/shared";
import { SettingsPage, SettingsScrollView, SettingsGroup } from "../../../src/components/settings/SettingsPage";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Segmented } from "../../../src/components/ui/Segmented";
import { Toggle } from "../../../src/components/ui/Toggle";
import { Button } from "../../../src/components/ui/Button";
import { Text } from "../../../src/components/ui/Text";
import { LockPrompt } from "../../../src/components/bookmarks/LockPrompt";
import { toast } from "../../../src/components/ui/toast-store";
import { useFolders } from "../../../src/hooks/use-folders";
import { useFolderTokenStore } from "../../../src/store/folder-tokens";
import { importExportApi } from "../../../src/lib/api/import-export";
import { qk } from "../../../src/lib/api/query-keys";
import { downloadExportFile, filenameFromDisposition } from "../../../src/lib/import-export-file";
import { errorMessage } from "../../../src/lib/error-message";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing } from "../../../src/theme/tokens";

const FORMAT_OPTIONS: ReadonlyArray<{ value: ExportFormat; label: string }> = [
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "csv", label: "CSV" },
];

const POLICY_OPTIONS: ReadonlyArray<{ value: DuplicatePolicy; label: string }> = [
  { value: "skip", label: "Skip" },
  { value: "update", label: "Update" },
  { value: "copy", label: "Add copies" },
];

type Phase = "idle" | "uploading" | "active";

export default function DataScreen() {
  const { palette } = useTheme();
  const qc = useQueryClient();
  const { data: folders = [] } = useFolders();

  const [format, setFormat] = useState<ExportFormat>("json");
  const [scope, setScope] = useState<string>("library");
  const [unlockTarget, setUnlockTarget] = useState<FolderDto | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<DuplicatePolicy>("skip");
  const [atomic, setAtomic] = useState(true);

  const tokenStore = useFolderTokenStore();

  const protectedFolders = useMemo(() => folders.filter((f) => f.protected), [folders]);

  const tokensFor = (ids: string[]): string[] =>
    ids
      .map((id) => tokenStore.get(id))
      .filter((t): t is string => Boolean(t));

  const lockedInScope =
    scope === "library"
      ? protectedFolders.filter((f) => !tokenStore.get(f.id))
      : protectedFolders.filter((f) => f.id === scope && !tokenStore.get(f.id));

  // --- export ---

  const exportMutation = useMutation({
    mutationFn: async () => {
      const folderId = scope === "library" ? null : scope;
      const tokens = tokensFor(
        scope === "library" ? protectedFolders.map((f) => f.id) : [scope],
      );
      const res = await importExportApi.requestExport(format, folderId, tokens);
      const filename = filenameFromDisposition(
        res.headers.get("content-disposition"),
        format === "json" ? "json" : format,
      );
      await downloadExportFile(await res.text(), filename);
    },
    onSuccess: () => toast.success("Export saved"),
    onError: (err) => toast.error(errorMessage(err, "The export failed.")),
  });

  // --- import ---

  const jobQuery = useQuery({
    queryKey: qk.importJob(jobId ?? "none"),
    queryFn: () => importExportApi.getImport(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "parsing" || query.state.data?.status === "committing" ? 800 : false,
    retry: false,
  });

  const job: ImportJobDto | undefined = jobQuery.data;
  const preview = job?.status === "ready" ? job.preview : null;

  const lockedMatches = useMemo(() => {
    if (!preview) return [] as FolderDto[];
    const names = new Set(preview.lockedFolderMatches.map((n) => n.trim().toLowerCase()));
    return folders.filter((f) => names.has(f.name.trim().toLowerCase()));
  }, [preview, folders]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ["text/*", "application/json", "application/octet-stream"],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if ((asset.size ?? 0) > IMPORT_EXPORT.MAX_FILE_BYTES) {
      toast.error("That file is larger than 50 MB.");
      return;
    }
    setPhase("uploading");
    try {
      const { jobId: id } = await importExportApi.uploadImport({
        uri: asset.uri,
        file: asset.file,
        name: asset.name || "import",
        size: asset.size,
      });
      setJobId(id);
      setPhase("active");
    } catch (err) {
      toast.error(errorMessage(err, "The upload failed."));
      setPhase("idle");
    }
  };

  const reset = () => {
    if (jobId) void importExportApi.cancelImport(jobId).catch(() => undefined);
    setJobId(null);
    setPhase("idle");
    setPolicy("skip");
    setAtomic(true);
  };

  const commitMutation = useMutation({
    mutationFn: () =>
      importExportApi.commitImport(
        jobId as string,
        { duplicatePolicy: policy, atomic },
        tokensFor(lockedMatches.map((f) => f.id)),
      ),
    onError: (err) => toast.error(errorMessage(err, "The import could not be confirmed.")),
  });

  React.useEffect(() => {
    if (job?.status === "completed") {
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
      void qc.invalidateQueries({ queryKey: qk.folders });
      void qc.invalidateQueries({ queryKey: ["tags"] });
    }
  }, [job?.status, qc]);

  const importBody = () => {
    if (phase === "idle") {
      return (
        <SettingRow
          icon="download-outline"
          label="Import from file"
          description="Ordo JSON, browser HTML, or Raindrop/Pocket/Instapaper CSV"
          onPress={pickFile}
          showChevron
          divider={false}
        />
      );
    }
    if (phase === "uploading") {
      return (
        <View style={styles.centerRow}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="footnote" color="secondary" style={styles.gapLeft}>
            Uploading…
          </Text>
        </View>
      );
    }
    if (jobQuery.isError) {
      return (
        <View style={styles.pad}>
          <Text variant="footnote" color="danger">
            {errorMessage(jobQuery.error, "This import no longer exists.")}
          </Text>
          <View style={styles.rowGap} />
          <Button label="Start over" variant="secondary" block onPress={reset} />
        </View>
      );
    }
    if (!job) {
      return (
        <View style={styles.centerRow}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="footnote" color="secondary" style={styles.gapLeft}>
            Preparing preview…
          </Text>
        </View>
      );
    }
    if (job.status === "parsing") {
      return (
        <View style={styles.centerRow}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="footnote" color="secondary" style={styles.gapLeft}>
            Reading {job.fileName ?? "file"}…
          </Text>
        </View>
      );
    }
    if (job.status === "failed") {
      return (
        <View style={styles.pad}>
          <Text variant="footnote" color="danger">
            {job.failure ?? "The file could not be read."}
          </Text>
          <View style={styles.rowGap} />
          <Button label="Start over" variant="secondary" block onPress={reset} />
        </View>
      );
    }
    if (job.status === "committing") {
      return (
        <View style={styles.centerRow}>
          <ActivityIndicator color={palette.accent} />
          <Text variant="footnote" color="secondary" style={styles.gapLeft}>
            Importing…
          </Text>
        </View>
      );
    }
    if (job.status === "completed" && job.result) {
      const r = job.result;
      return (
        <View style={styles.pad}>
          <Text variant="bodyStrong">Import complete</Text>
          <View style={styles.rowGap} />
          <Text variant="footnote" color="secondary">
            {r.imported} added · {r.updated} updated · {r.skipped} skipped · {r.failed} failed ·{" "}
            {r.foldersCreated} new folders
          </Text>
          {r.failures.length > 0 ? (
            <>
              <View style={styles.rowGap} />
              {r.failures.slice(0, 5).map((f, i) => (
                <Text key={i} variant="caption" color="tertiary">
                  {f.url ? `${f.url} — ` : ""}
                  {f.reason}
                </Text>
              ))}
            </>
          ) : null}
          <View style={styles.rowGap} />
          <Button label="Done" block onPress={reset} />
        </View>
      );
    }

    // ready → confirm
    const p = preview;
    if (!p) return null;
    return (
      <View style={styles.pad}>
        <Text variant="bodyStrong">{p.validRows} bookmarks found</Text>
        <Text variant="footnote" color="secondary" style={styles.tightTop}>
          {p.duplicates} already in your library · {p.withinFileDuplicates} repeated in the file ·{" "}
          {p.invalidRows} unreadable
        </Text>
        {p.newFolders.length > 0 ? (
          <Text variant="footnote" color="tertiary" style={styles.tightTop}>
            New folders: {p.newFolders.join(", ")}
          </Text>
        ) : null}

        {lockedMatches.length > 0 ? (
          <View style={styles.lockedBox}>
            <Text variant="footnote" color="secondary">
              Unlock these folders to import into them:
            </Text>
            {lockedMatches.map((f) => (
              <SettingRow
                key={f.id}
                icon="lock-closed-outline"
                label={f.name}
                onPress={() => setUnlockTarget(f)}
                value={tokenStore.get(f.id) ? "Unlocked" : undefined}
                divider={false}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.rowGap} />
        <Text variant="caption" color="secondary" style={styles.labelGap}>
          WHEN A BOOKMARK ALREADY EXISTS
        </Text>
        <Segmented options={POLICY_OPTIONS} value={policy} onChange={setPolicy} />

        <View style={styles.rowGap} />
        <SettingRow
          icon="shield-checkmark-outline"
          label="All at once"
          description={atomic ? "Import everything or nothing" : "Keep rows that succeed"}
          right={<Toggle value={atomic} onValueChange={setAtomic} />}
          divider={false}
        />

        <View style={styles.rowGap} />
        <Button
          label={`Import ${p.validRows} bookmarks`}
          block
          size="lg"
          loading={commitMutation.isPending}
          onPress={() => commitMutation.mutate()}
        />
        <View style={styles.smallGap} />
        <Button label="Discard" variant="ghost" block onPress={reset} disabled={commitMutation.isPending} />
      </View>
    );
  };

  return (
    <SettingsPage title="Data">
      <SettingsScrollView>
        <SettingsGroup
          label="Export"
          compact
          footer={
            scope === "library" && lockedInScope.length > 0
              ? `${lockedInScope.length} locked folder${lockedInScope.length === 1 ? "" : "s"} will be excluded. Unlock to include.`
              : undefined
          }
        >
          <View style={styles.pad}>
            <Segmented options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
          </View>
          <SettingRow
            icon="library-outline"
            label="Entire library"
            description="Every unlocked folder plus unfiled bookmarks"
            value={scope === "library" ? "Selected" : undefined}
            onPress={() => setScope("library")}
          />
          {folders.map((folder) => (
            <SettingRow
              key={folder.id}
              icon={folder.protected ? "lock-closed-outline" : "folder-outline"}
              label={folder.name}
              description={`${folder.bookmarkCount} bookmarks`}
              value={scope === folder.id ? "Selected" : undefined}
              onPress={() => {
                setScope(folder.id);
                if (folder.protected && !tokenStore.get(folder.id)) setUnlockTarget(folder);
              }}
              divider={false}
            />
          ))}
          <View style={styles.pad}>
            <Button
              label={`Export as ${format.toUpperCase()}`}
              block
              size="lg"
              loading={exportMutation.isPending}
              onPress={() => exportMutation.mutate()}
            />
          </View>
        </SettingsGroup>

        <SettingsGroup label="Import" footer="Imported bookmarks keep their titles; article content is fetched again in the background.">
          {importBody()}
        </SettingsGroup>
      </SettingsScrollView>

      <LockPrompt
        visible={unlockTarget !== null}
        folderId={unlockTarget?.id ?? ""}
        folderName={unlockTarget?.name}
        lockType={unlockTarget?.lockType ?? "password"}
        onDismiss={() => setUnlockTarget(null)}
        onUnlocked={() => {
          setUnlockTarget(null);
          toast.success("Folder unlocked");
        }}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing[16] },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: spacing[20] },
  gapLeft: { marginLeft: spacing[10] },
  rowGap: { height: spacing[14] },
  smallGap: { height: spacing[8] },
  tightTop: { marginTop: spacing[4] },
  labelGap: { marginBottom: spacing[8] },
  lockedBox: { marginTop: spacing[12] },
});
