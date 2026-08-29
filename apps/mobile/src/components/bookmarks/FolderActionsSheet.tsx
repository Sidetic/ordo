import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_FOLDER_ICON, type FolderDto, type FolderIcon } from "@ordo/shared";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { SheetActionRow } from "../ui/SheetActionRow";
import { EyeToggle } from "../ui/EyeToggle";
import { PressableScale } from "../ui/PressableScale";
import { FolderIconPicker } from "./FolderIconPicker";
import { MfaStepUpPanel } from "../auth/MfaStepUpPanel";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { errorMessage, isMfaRequiredError } from "../../lib/error-message";
import { foldersApi } from "../../lib/api/folders";
import { useAuthStore } from "../../store/auth";
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
  const mfaEnabled = useAuthStore((s) => s.user?.mfaEnabled);
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
  const [mfaOpen, setMfaOpen] = useState(false);
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
    setMfaOpen(false);
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
    setMfaOpen(false);
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

  const removeWithAccountPassword = async (mfaCode?: string) => {
    if (!folder) return;
    if (!accountPassword) {
      throw new Error("Enter your account password.");
    }
    await foldersApi.removePassword(folder.id, { accountPassword, mfaCode });
    finishRemoved();
  };

  const submitAccountBypass = async () => {
    if (!folder || removing) return;
    setError("");
    if (!accountPassword) {
      setError("Enter your account password.");
      return;
    }
    if (mfaEnabled) {
      setMfaOpen(true);
      return;
    }
    setRemoving(true);
    try {
      await removeWithAccountPassword();
    } catch (cause) {
      if (isMfaRequiredError(cause)) {
        setMfaOpen(true);
        return;
      }
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
    <>
    <FloatingPanel visible={visible && !!folder && !mfaOpen} onDismiss={onDismiss}>
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
          <Text variant="title3">Lock folder</Text>
          <Text variant="footnote" color="secondary" style={styles.copy}>A password will be required to view this folder.</Text>
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
          <View style={[styles.dangerIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="lock-open-outline" size={24} color={palette.danger} />
          </View>
          <Text variant="title3" align="center">Remove password?</Text>
          <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
            This folder will no longer require a password to open.
          </Text>
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
          <View style={[styles.dangerIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="lock-open-outline" size={24} color={palette.danger} />
          </View>
          <Text variant="title3" align="center">Remove password?</Text>
          <Text variant="body" color="secondary" align="center" style={styles.confirmCopy}>
            Enter your account password to remove this folder's lock.
          </Text>
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

    <MfaStepUpPanel
      visible={mfaOpen}
      onDismiss={() => setMfaOpen(false)}
      title="Remove password?"
      description="Enter a current authenticator or backup code to remove this folder's lock."
      confirmLabel="Remove password"
      confirmVariant="danger"
      onConfirm={removeWithAccountPassword}
      onUnhandledError={(cause) => {
        haptics.error();
        setError(errorMessage(cause));
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[12], marginBottom: spacing[8] },
  titleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  titleBody: { flex: 1 },
  heading: { marginBottom: spacing[16] },
  copy: { marginTop: spacing[4], marginBottom: spacing[16] },
  error: { marginTop: spacing[10] },
  menuCancel: { marginTop: spacing[8] },
  actions: { gap: spacing[8], marginTop: spacing[20] },
  dangerIcon: { width: 48, height: 48, borderRadius: 16, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: spacing[12] },
  confirmCopy: { marginTop: spacing[8], marginBottom: spacing[16] },
  forgot: { alignSelf: "flex-start", marginTop: spacing[10] },
});
