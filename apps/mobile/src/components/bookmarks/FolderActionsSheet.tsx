/**
 * Folder action sheet: rename, set/remove password, export, delete.
 * Sub-prompts (rename / set password) render inline within the same sheet.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Sheet } from "../ui/Sheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { errorMessage } from "../../lib/error-message";
import { foldersApi } from "../../lib/api/folders";
import {
  useRenameFolder,
  useDeleteFolder,
} from "../../hooks/use-folders";
import { useFolderTokenStore } from "../../store/folder-tokens";
import type { FolderDto } from "@ordo/shared";

type Mode = "menu" | "rename" | "password";

export interface FolderActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  folder: FolderDto | null;
  onDeleted?: (id: string) => void;
}

function Row({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const color = tone === "danger" ? palette.danger : palette.text;
  return (
    <PressableScale
      style={[styles.row, { borderBottomColor: palette.border }]}
      onPress={() => {
        haptics.light();
        onPress();
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="body" style={{ color }}>{label}</Text>
    </PressableScale>
  );
}

export function FolderActionsSheet({ visible, onDismiss, folder, onDeleted }: FolderActionsSheetProps) {
  const { palette } = useTheme();
  const rename = useRenameFolder();
  const del = useDeleteFolder();
  const clearToken = useFolderTokenStore((s) => s.clear);
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setMode("menu");
      setName(folder?.name ?? "");
      setPassword("");
      setError("");
    }
  }, [visible, folder]);

  const close = () => onDismiss();
  const showMode = (nextMode: Mode) => {
    setError("");
    setMode(nextMode);
  };

  const doRename = async () => {
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    try {
      await rename.mutateAsync({ id: folder.id, name: trimmed });
      haptics.success();
      close();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const doSetPassword = async () => {
    if (!folder) return;
    if (password.length < 4) {
      setError("Use at least 4 characters.");
      return;
    }
    try {
      await foldersApi.setPassword(folder.id, password);
      clearToken(folder.id);
      haptics.success();
      toast.success("Folder protected");
      close();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const doRemovePassword = async () => {
    if (!folder) return;
    setError("");
    try {
      await foldersApi.removePassword(folder.id);
      clearToken(folder.id);
      haptics.success();
      toast.success("Protection removed");
      close();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const doExport = async (format: "json" | "html") => {
    if (!folder) return;
    setError("");
    try {
      const res = await foldersApi.export(folder.id, format);
      const body = await res.text();
      const safeName = folder.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "export";
      const fileUri = `${FileSystem.documentDirectory}${safeName}.${format}`;
      await FileSystem.writeAsStringAsync(fileUri, body, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: format === "json" ? "application/json" : "text/html",
        dialogTitle: `Export ${folder.name}`,
      });
      close();
    } catch (e) {
      setError(errorMessage(e, "Export failed."));
    }
  };

  const doDelete = async () => {
    if (!folder) return;
    setError("");
    try {
      await del.mutateAsync(folder.id);
      clearToken(folder.id);
      haptics.success();
      onDeleted?.(folder.id);
      close();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (!folder) {
    return (
      <Sheet visible={visible} onDismiss={onDismiss}>
        <View />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onDismiss={close}>
      {mode === "menu" ? (
        <>
          <Text variant="title3" align="center" numberOfLines={1} style={{ marginBottom: spacing[8] }}>{folder.name}</Text>
          {error ? (
            <Text variant="footnote" color="danger" style={{ marginBottom: spacing[8] }}>
              {error}
            </Text>
          ) : null}
          <View>
            <Row icon="create-outline" label="Rename" onPress={() => showMode("rename")} />
            {folder.protected ? (
              <Row icon="lock-open-outline" label="Remove password" onPress={doRemovePassword} />
            ) : (
              <Row icon="lock-closed-outline" label="Set password" onPress={() => showMode("password")} />
            )}
            <Row icon="code-slash-outline" label="Export as JSON" onPress={() => doExport("json")} />
            <Row icon="globe-outline" label="Export as HTML" onPress={() => doExport("html")} />
            <Row icon="trash-outline" label="Delete folder" tone="danger" onPress={doDelete} />
          </View>
        </>
      ) : null}

      {mode === "rename" ? (
        <>
          <Text variant="title3" style={{ marginBottom: spacing[16] }}>Rename folder</Text>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            autoFocus
            error={error || undefined}
            onSubmitEditing={doRename}
          />
          <View style={{ height: spacing[20] }} />
          <Button label="Save" block size="lg" onPress={doRename} loading={rename.isPending} />
          <View style={{ height: spacing[10] }} />
          <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
        </>
      ) : null}

      {mode === "password" ? (
        <>
          <Text variant="title3" style={{ marginBottom: spacing[4] }}>Protect folder</Text>
          <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
            A password will be required to view this folder's bookmarks.
          </Text>
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 4 characters"
            secureTextEntry
            autoFocus
            error={error || undefined}
          />
          <View style={{ height: spacing[20] }} />
          <Button label="Set password" block size="lg" onPress={doSetPassword} />
          <View style={{ height: spacing[10] }} />
          <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
        </>
      ) : null}

      {del.isPending ? (
        <View style={[styles.deletingOverlay, { backgroundColor: palette.overlay }]} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[14],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deletingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 },
});
