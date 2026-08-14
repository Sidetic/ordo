import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_FOLDER_ICON, type FolderDto, type FolderIcon } from "@ordo/shared";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { PressableScale } from "../ui/PressableScale";
import { FolderIconPicker } from "./FolderIconPicker";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { errorMessage } from "../../lib/error-message";
import { foldersApi } from "../../lib/api/folders";
import {
  invalidateBookmarks,
  useDeleteFolder,
  useRenameFolder,
  useUpdateFolder,
} from "../../hooks/use-folders";
import { useFolderTokenStore } from "../../store/folder-tokens";

type Mode = "menu" | "rename" | "password" | "icon" | "pin" | "delete";

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
      <Text variant="body" style={[styles.rowLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </PressableScale>
  );
}

export function FolderActionsSheet({ visible, onDismiss, folder, onDeleted }: FolderActionsSheetProps) {
  const { palette } = useTheme();
  const rename = useRenameFolder();
  const update = useUpdateFolder();
  const del = useDeleteFolder();
  const clearToken = useFolderTokenStore((state) => state.clear);
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [icon, setIcon] = useState<FolderIcon>(DEFAULT_FOLDER_ICON);
  const [error, setError] = useState("");
  const folderRef = React.useRef(folder);
  folderRef.current = folder;

  React.useEffect(() => {
    if (!visible) return;
    const currentFolder = folderRef.current;
    setMode("menu");
    setName(currentFolder?.name ?? "");
    setPassword("");
    setIcon(currentFolder?.icon ?? DEFAULT_FOLDER_ICON);
    setError("");
  }, [visible, folder?.id]);

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
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const doUpdateIcon = async () => {
    if (!folder) return;
    try {
      await update.mutateAsync({ id: folder.id, input: { icon } });
      haptics.success();
      toast.success("Folder icon updated");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const doTogglePinned = async () => {
    if (!folder || update.isPending) return;
    try {
      await update.mutateAsync({ id: folder.id, input: { pinned: !folder.pinned } });
      haptics.success();
      toast.success(folder.pinned ? "Folder unpinned" : "Folder pinned");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
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
      invalidateBookmarks();
      haptics.success();
      toast.success("Folder protected");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const doRemovePassword = async () => {
    if (!folder) return;
    try {
      await foldersApi.removePassword(folder.id);
      clearToken(folder.id);
      invalidateBookmarks();
      haptics.success();
      toast.success("Protection removed");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const doDelete = async () => {
    if (!folder) return;
    try {
      await del.mutateAsync(folder.id);
      clearToken(folder.id);
      haptics.success();
      onDeleted?.(folder.id);
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <FloatingPanel visible={visible && !!folder} onDismiss={onDismiss}>
      {folder && mode === "menu" ? (
        <>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name={folder.icon ?? DEFAULT_FOLDER_ICON} size={22} color={palette.accent} />
            </View>
            <View style={styles.titleBody}>
              <Text variant="title3" numberOfLines={1}>{folder.name}</Text>
              <Text variant="footnote" color="tertiary">
                {folder.bookmarkCount} {folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}
              </Text>
            </View>
            {folder.pinned ? <Ionicons name="pin" size={18} color={palette.accent} /> : null}
          </View>
          {error ? <Text variant="footnote" color="danger" style={styles.error}>{error}</Text> : null}
          <View>
            <Row icon={folder.pinned ? "pin" : "pin-outline"} label={folder.pinned ? "Unpin folder" : "Pin folder"} onPress={() => showMode("pin")} />
            <Row icon="happy-outline" label="Change icon" onPress={() => showMode("icon")} />
            <Row icon="create-outline" label="Rename" onPress={() => showMode("rename")} />
            {folder.protected ? (
              <Row icon="lock-open-outline" label="Remove password" onPress={doRemovePassword} />
            ) : (
              <Row icon="lock-closed-outline" label="Set password" onPress={() => showMode("password")} />
            )}
            <Row icon="trash-outline" label="Delete folder" tone="danger" onPress={() => showMode("delete")} />
          </View>
          <Button label="Cancel" variant="ghost" block onPress={onDismiss} style={styles.menuCancel} />
        </>
      ) : null}

      {folder && mode === "rename" ? (
        <>
          <Text variant="title3" style={styles.heading}>Rename folder</Text>
          <Input label="Name" value={name} onChangeText={setName} autoFocus error={error || undefined} onSubmitEditing={doRename} />
          <View style={styles.actions}>
            <Button label="Save" block size="lg" onPress={doRename} loading={rename.isPending} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "password" ? (
        <>
          <Text variant="title3">Protect folder</Text>
          <Text variant="footnote" color="secondary" style={styles.copy}>A password will be required to view this folder.</Text>
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 4 characters" secureTextEntry autoFocus error={error || undefined} />
          <View style={styles.actions}>
            <Button label="Set password" block size="lg" onPress={doSetPassword} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "icon" ? (
        <>
          <Text variant="title3">Choose an icon</Text>
          <Text variant="footnote" color="secondary" style={styles.copy}>Pick an icon that makes this folder easy to spot.</Text>
          <FolderIconPicker value={icon} onChange={setIcon} />
          {error ? <Text variant="footnote" color="danger" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Save icon" block size="lg" onPress={doUpdateIcon} loading={update.isPending} disabled={icon === folder.icon} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "pin" ? (
        <>
          <View style={[styles.pinIcon, { backgroundColor: palette.accentSoft }]}>
            <Ionicons name={folder.pinned ? "pin-outline" : "pin"} size={24} color={palette.accent} />
          </View>
          <Text variant="title3" align="center">
            {folder.pinned ? "Unpin folder?" : "Pin folder?"}
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
            {folder.pinned
              ? `${folder.name} will return to its normal position.`
              : `${folder.name} will stay near the top of your folder list.`}
          </Text>
          {error ? <Text variant="footnote" color="danger" align="center" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button
              label={folder.pinned ? "Unpin folder" : "Pin folder"}
              block
              size="lg"
              onPress={doTogglePinned}
              loading={update.isPending}
            />
            <Button label="Cancel" variant="ghost" block disabled={update.isPending} onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "delete" ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={[styles.dangerIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="trash-outline" size={24} color={palette.danger} />
          </View>
          <Text variant="title3" align="center">Delete {folder.name}?</Text>
          <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
            {folder.bookmarkCount > 0
              ? `This will permanently delete the folder and its ${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}.`
              : "This folder will be permanently deleted."}
          </Text>
          {error ? <Text variant="footnote" color="danger" align="center" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Delete folder" variant="danger" block size="lg" onPress={doDelete} loading={del.isPending} />
            <Button label="Cancel" variant="ghost" block disabled={del.isPending} onPress={() => showMode("menu")} />
          </View>
        </ScrollView>
      ) : null}
    </FloatingPanel>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[12], marginBottom: spacing[8] },
  titleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  titleBody: { flex: 1 },
  heading: { marginBottom: spacing[16] },
  copy: { marginTop: spacing[4], marginBottom: spacing[16] },
  error: { marginTop: spacing[10] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12], minHeight: 50, paddingHorizontal: spacing[4], borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { flex: 1 },
  menuCancel: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[20] },
  pinIcon: { width: 48, height: 48, borderRadius: 16, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: spacing[12] },
  dangerIcon: { width: 48, height: 48, borderRadius: 16, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: spacing[12] },
  confirmCopy: { marginTop: spacing[8] },
});
