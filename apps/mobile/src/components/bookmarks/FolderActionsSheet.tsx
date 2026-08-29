import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_FOLDER_ICON, type FolderDto, type FolderIcon } from "@ordo/shared";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { SheetActionRow } from "../ui/SheetActionRow";
import { EyeToggle } from "../ui/EyeToggle";
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

type Mode = "menu" | "rename" | "password" | "icon" | "delete" | "removePassword" | "removePasswordAccount";

export interface FolderActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  folder: FolderDto | null;
  onDeleted?: (id: string) => void;
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
  const [showPassword, setShowPassword] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [icon, setIcon] = useState<FolderIcon>(DEFAULT_FOLDER_ICON);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const folderRef = React.useRef(folder);
  folderRef.current = folder;

  React.useEffect(() => {
    if (!visible) return;
    const currentFolder = folderRef.current;
    setMode("menu");
    setName(currentFolder?.name ?? "");
    setPassword("");
    setShowPassword(false);
    setAccountPassword("");
    setShowAccountPassword(false);
    setIcon(currentFolder?.icon ?? DEFAULT_FOLDER_ICON);
    setError("");
    setRemoving(false);
  }, [visible, folder?.id]);

  const showMode = (nextMode: Mode) => {
    setError("");
    if (nextMode !== "password" && nextMode !== "removePassword") {
      setPassword("");
      setShowPassword(false);
    }
    if (nextMode !== "removePasswordAccount") {
      setAccountPassword("");
      setShowAccountPassword(false);
    }
    setMode(nextMode);
  };

  const doRename = async () => {
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a folder name.");
      return;
    }
    try {
      await rename.mutateAsync({ id: folder.id, name: trimmed });
      haptics.success();
      toast.success("Folder renamed");
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
      toast.success("Folder locked");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const finishRemoved = () => {
    if (!folder) return;
    clearToken(folder.id);
    invalidateBookmarks();
    haptics.success();
    toast.success("Password removed");
    onDismiss();
  };

  const removeWithFolderPassword = async () => {
    if (!folder || removing) return;
    if (!password) {
      setError("Enter the folder password.");
      return;
    }
    setError("");
    setRemoving(true);
    try {
      await foldersApi.removePassword(folder.id, { folderPassword: password });
      finishRemoved();
    } catch (cause) {
      haptics.error();
      setError(errorMessage(cause, "That password is incorrect."));
    } finally {
      setRemoving(false);
    }
  };

  const submitAccountBypass = async () => {
    if (!folder || removing) return;
    setError("");
    if (!accountPassword) {
      setError("Enter your account password.");
      return;
    }
    setRemoving(true);
    try {
      await foldersApi.removePassword(folder.id, { accountPassword });
      finishRemoved();
    } catch (cause) {
      haptics.error();
      setError(errorMessage(cause));
    } finally {
      setRemoving(false);
    }
  };

  const doDelete = async () => {
    if (!folder) return;
    try {
      await del.mutateAsync(folder.id);
      clearToken(folder.id);
      invalidateBookmarks();
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
          <PanelHeader
            icon={folder.icon ?? DEFAULT_FOLDER_ICON}
            iconColor={palette.accent}
            iconBackground={palette.surfaceSecondary}
            title={folder.name}
            subtitle={`${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}`}
            numberOfLines={1}
            accessory={
              folder.pinned ? (
                <Ionicons name="pin" size={14} color={palette.accent} />
              ) : null
            }
            style={styles.menuHeader}
          />
          {error ? <Text variant="footnote" color="danger" style={styles.error}>{error}</Text> : null}
          <View>
            <SheetActionRow icon={folder.pinned ? "pin" : "pin-outline"} label={folder.pinned ? "Unpin folder" : "Pin folder"} onPress={doTogglePinned} />
            <SheetActionRow icon="happy-outline" label="Change icon" onPress={() => showMode("icon")} />
            <SheetActionRow icon="create-outline" label="Rename" onPress={() => showMode("rename")} />
            {folder.protected ? (
              <SheetActionRow icon="lock-open-outline" label="Remove password" onPress={() => showMode("removePassword")} />
            ) : (
              <SheetActionRow icon="lock-closed-outline" label="Lock folder" onPress={() => showMode("password")} />
            )}
            <SheetActionRow icon="trash-outline" label="Delete folder" tone="danger" onPress={() => showMode("delete")} />
          </View>
          <Button label="Cancel" variant="ghost" block onPress={onDismiss} style={styles.menuCancel} />
        </>
      ) : null}

      {folder && mode === "rename" ? (
        <>
          <PanelHeader title="Rename folder" />
          <Input label="Name" value={name} onChangeText={setName} autoFocus error={error || undefined} onSubmitEditing={doRename} />
          <View style={styles.actions}>
            <Button label="Save" block size="lg" onPress={doRename} loading={rename.isPending} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "password" ? (
        <>
          <PanelHeader
            title="Lock folder"
            subtitle="A password will be required to view this folder."
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 4 characters"
            secureTextEntry={!showPassword}
            autoFocus
            error={error || undefined}
            rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
          />
          <View style={styles.actions}>
            <Button label="Lock folder" block size="lg" onPress={doSetPassword} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "removePassword" ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <PanelHeader
            icon="lock-open-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Remove password?"
            subtitle="This folder will no longer require a password to open."
            subtitleVariant="body"
          />
          <Input
            label="Folder password"
            value={password}
            onChangeText={setPassword}
            placeholder="Folder password"
            secureTextEntry={!showPassword}
            autoFocus
            error={error || undefined}
            onSubmitEditing={removeWithFolderPassword}
            rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Forgot the folder password?"
            hitSlop={8}
            onPress={() => showMode("removePasswordAccount")}
            style={styles.forgot}
          >
            <Text variant="footnote" color="accent">Forgot the folder password?</Text>
          </PressableScale>
          <View style={styles.actions}>
            <Button label="Remove password" variant="danger" block size="lg" onPress={removeWithFolderPassword} loading={removing} />
            <Button label="Cancel" variant="ghost" block disabled={removing} onPress={() => showMode("menu")} />
          </View>
        </ScrollView>
      ) : null}

      {folder && mode === "removePasswordAccount" ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <PanelHeader
            icon="lock-open-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Remove password?"
            subtitle="Enter your account password to remove this folder's lock."
            subtitleVariant="body"
          />
          <Input
            label="Account password"
            value={accountPassword}
            onChangeText={setAccountPassword}
            placeholder="Your account password"
            secureTextEntry={!showAccountPassword}
            autoFocus
            error={error || undefined}
            onSubmitEditing={submitAccountBypass}
            textContentType="password"
            autoComplete="password"
            rightAccessory={<EyeToggle visible={showAccountPassword} onPress={() => setShowAccountPassword((value) => !value)} />}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Use folder password"
            hitSlop={8}
            onPress={() => showMode("removePassword")}
            style={styles.forgot}
          >
            <Text variant="footnote" color="accent">Use folder password</Text>
          </PressableScale>
          <View style={styles.actions}>
            <Button label="Remove password" variant="danger" block size="lg" onPress={submitAccountBypass} loading={removing} />
            <Button label="Cancel" variant="ghost" block disabled={removing} onPress={() => showMode("menu")} />
          </View>
        </ScrollView>
      ) : null}

      {folder && mode === "icon" ? (
        <>
          <PanelHeader
            title="Choose an icon"
            subtitle="Pick an icon that makes this folder easy to spot."
          />
          <FolderIconPicker value={icon} onChange={setIcon} />
          {error ? <Text variant="footnote" color="danger" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Save icon" block size="lg" onPress={doUpdateIcon} loading={update.isPending} disabled={icon === folder.icon} />
            <Button label="Cancel" variant="ghost" block onPress={() => showMode("menu")} />
          </View>
        </>
      ) : null}

      {folder && mode === "delete" ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <PanelHeader
            icon="trash-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title={`Delete ${folder.name}?`}
            subtitle={
              folder.bookmarkCount > 0
                ? `This will permanently delete the folder and its ${folder.bookmarkCount} ${folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}.`
                : "This folder will be permanently deleted."
            }
            subtitleVariant="body"
          />
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
  menuHeader: { marginBottom: spacing[8] },
  error: { marginTop: spacing[10] },
  menuCancel: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[20] },
  forgot: { alignSelf: "center", marginTop: spacing[10] },
});
