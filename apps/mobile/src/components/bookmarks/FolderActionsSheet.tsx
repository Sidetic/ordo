import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_FOLDER_ICON, type FolderDto, type FolderIcon, type FolderLockType } from "@ordo/shared";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { SheetActionRow } from "../ui/SheetActionRow";
import { EyeToggle } from "../ui/EyeToggle";
import { PressableScale } from "../ui/PressableScale";
import { FolderIconPicker } from "./FolderIconPicker";
import { PatternInput } from "./PatternInput";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { errorMessage } from "../../lib/error-message";
import { foldersApi } from "../../lib/api/folders";
import {
  createDeviceLockCredential,
  deleteDeviceLockCredential,
  getDeviceLockCredential,
  isDeviceLockAvailable,
} from "../../lib/device-folder-lock";
import {
  invalidateBookmarks,
  patchFolderLock,
  useDeleteFolder,
  useRenameFolder,
  useUpdateFolder,
} from "../../hooks/use-folders";
import { useServerInfo } from "../../hooks/queries";
import { useFolderTokenStore } from "../../store/folder-tokens";

type Mode = "menu" | "rename" | "lockChoice" | "lockCredential" | "icon" | "delete" | "removePassword" | "removePasswordAccount";

export interface FolderActionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  folder: FolderDto | null;
  onDeleted?: (id: string) => void;
}

export function FolderActionsSheet({ visible, onDismiss, folder, onDeleted }: FolderActionsSheetProps) {
  const { palette } = useTheme();
  const serverInfo = useServerInfo();
  /** Older servers drop lockType and silently store every lock as a password. */
  const lockTypesSupported = serverInfo.data?.folderLockTypes === true;
  const rename = useRenameFolder();
  const update = useUpdateFolder();
  const del = useDeleteFolder();
  const clearToken = useFolderTokenStore((state) => state.clear);
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lockType, setLockType] = useState<FolderLockType>("password");
  const [pattern, setPattern] = useState<number[]>([]);
  const [savedPattern, setSavedPattern] = useState<number[]>([]);
  const [deviceLockAvailable, setDeviceLockAvailable] = useState(false);
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
    setConfirmPassword("");
    setLockType("password");
    setPattern([]);
    setSavedPattern([]);
    setShowPassword(false);
    setAccountPassword("");
    setShowAccountPassword(false);
    setIcon(currentFolder?.icon ?? DEFAULT_FOLDER_ICON);
    setError("");
    setRemoving(false);
    void isDeviceLockAvailable().then(setDeviceLockAvailable);
  }, [visible, folder?.id]);

  const showMode = (nextMode: Mode) => {
    setError("");
    if (nextMode !== "lockCredential" && nextMode !== "removePassword") {
      setPassword("");
      setConfirmPassword("");
      setPattern([]);
      setSavedPattern([]);
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

  const doSetCredential = async () => {
    if (!folder) return;
    const credential = lockType === "pattern" ? pattern.join("-") : password;
    if (lockType === "pattern" && savedPattern.length === 0) {
      if (pattern.length < 4) {
        setError("Connect at least 4 dots.");
        return;
      }
      setSavedPattern(pattern);
      setPattern([]);
      setError("");
      return;
    }
    if (lockType === "pattern" && savedPattern.join("-") !== credential) {
      setError("Patterns do not match. Try again.");
      setPattern([]);
      return;
    }
    if (lockType === "pin" && !/^\d{4,12}$/.test(password)) {
      setError("Use a 4 to 12 digit PIN.");
      return;
    }
    if (lockType === "pin" && password !== confirmPassword) {
      setError("PINs do not match.");
      return;
    }
    if (lockType === "password" && password.length < 4) {
      setError("Use at least 4 characters.");
      return;
    }
    if ((lockType === "password" || lockType === "pin") && password !== confirmPassword) {
      setError(lockType === "pin" ? "PINs do not match." : "Passwords do not match.");
      return;
    }
    try {
      await foldersApi.setPassword(folder.id, { password: credential, lockType });
      patchFolderLock(folder.id, { protected: true, lockType });
      clearToken(folder.id);
      invalidateBookmarks();
      haptics.success();
      toast.success("Folder locked");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const doSetDeviceLock = async () => {
    if (!folder) return;
    if (!deviceLockAvailable) {
      setError("Set up fingerprint or face unlock on this device first.");
      return;
    }
    setRemoving(true);
    setError("");
    try {
      const credential = await createDeviceLockCredential(folder.id);
      try {
        await foldersApi.setPassword(folder.id, { password: credential, lockType: "device" });
      } catch (cause) {
        await deleteDeviceLockCredential(folder.id);
        throw cause;
      }
      patchFolderLock(folder.id, { protected: true, lockType: "device" });
      clearToken(folder.id);
      invalidateBookmarks();
      haptics.success();
      toast.success("Folder locked");
      onDismiss();
    } catch (cause) {
      setError(errorMessage(cause, "Could not enable the device lock."));
    } finally {
      setRemoving(false);
    }
  };

  const finishRemoved = () => {
    if (!folder) return;
    patchFolderLock(folder.id, { protected: false, lockType: null });
    clearToken(folder.id);
    invalidateBookmarks();
    haptics.success();
    toast.success("Lock removed");
    void deleteDeviceLockCredential(folder.id);
    onDismiss();
  };

  const removeWithDeviceLock = async () => {
    if (!folder || removing) return;
    setError("");
    setRemoving(true);
    let credential: string | null;
    try {
      credential = await getDeviceLockCredential(folder.id);
      if (!credential) {
        setError("This device no longer has the folder key. Use your account password instead.");
        setRemoving(false);
        return;
      }
    } catch {
      haptics.error();
      setError("Device authentication was cancelled or unsuccessful.");
      setRemoving(false);
      return;
    }
    try {
      await foldersApi.removePassword(folder.id, { folderPassword: credential });
      finishRemoved();
    } catch (cause) {
      haptics.error();
      setError(errorMessage(cause));
    } finally {
      setRemoving(false);
    }
  };

  const removeWithFolderPassword = async () => {
    if (!folder || removing) return;
    const lockKind = folder.lockType ?? "password";
    const credential = lockKind === "pattern" ? pattern.join("-") : password;
    if (!credential || (lockKind === "pattern" && pattern.length < 4)) {
      setError(lockKind === "pattern" ? "Connect at least 4 dots." : `Enter the folder ${lockKind === "pin" ? "PIN" : "password"}.`);
      return;
    }
    setError("");
    setRemoving(true);
    try {
      await foldersApi.removePassword(folder.id, { folderPassword: credential });
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
              <SheetActionRow icon="lock-open-outline" label="Remove lock" onPress={() => showMode("removePassword")} />
            ) : (
              <SheetActionRow icon="lock-closed-outline" label="Lock folder" onPress={() => showMode("lockChoice")} />
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

      {folder && mode === "lockChoice" ? (
        <>
          <PanelHeader
            title="Lock folder"
            subtitle="Choose how you want to unlock this folder."
          />
          {error ? <Text variant="footnote" color="danger" style={styles.error}>{error}</Text> : null}
          {serverInfo.data && !lockTypesSupported ? (
            <Text variant="footnote" color="tertiary" style={styles.staleServer}>
              Update your Ordo server to use pattern, PIN, and device locks.
            </Text>
          ) : null}
          <View>
            {lockTypesSupported ? (
              <>
                <SheetActionRow icon="finger-print-outline" label="Device lock" onPress={doSetDeviceLock} />
                <SheetActionRow icon="apps-outline" label="Pattern" onPress={() => { setLockType("pattern"); showMode("lockCredential"); }} />
                <SheetActionRow icon="keypad-outline" label="PIN" onPress={() => { setLockType("pin"); showMode("lockCredential"); }} />
              </>
            ) : null}
            <SheetActionRow icon="text-outline" label="Text password" onPress={() => { setLockType("password"); showMode("lockCredential"); }} />
          </View>
          <Button label="Cancel" variant="ghost" block disabled={removing} onPress={() => showMode("menu")} style={styles.menuCancel} />
        </>
      ) : null}

      {folder && mode === "lockCredential" ? (
        <>
          <PanelHeader
            title={lockType === "pattern" ? (savedPattern.length ? "Confirm pattern" : "Set a pattern") : lockType === "pin" ? "Set a PIN" : "Set a password"}
            subtitle={lockType === "pattern" ? "Tap at least 4 dots in order." : lockType === "pin" ? "Use 4 to 12 digits." : "Use at least 4 characters."}
          />
          {lockType === "pattern" ? (
            <>
              <PatternInput value={pattern} onChange={setPattern} />
              {error ? <Text variant="footnote" color="danger" align="center">{error}</Text> : null}
            </>
          ) : (
            <>
              <Input
                label={lockType === "pin" ? "PIN" : "Password"}
                value={password}
                onChangeText={(value) => setPassword(lockType === "pin" ? value.replace(/\D/g, "").slice(0, 12) : value)}
                placeholder={lockType === "pin" ? "4 to 12 digits" : "At least 4 characters"}
                keyboardType={lockType === "pin" ? "number-pad" : "default"}
                secureTextEntry={!showPassword}
                autoFocus
                error={error || undefined}
                autoCapitalize="none"
                autoCorrect={false}
                rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
              />
              {lockType === "pin" || lockType === "password" ? (
                <Input
                  label={lockType === "pin" ? "Confirm PIN" : "Confirm password"}
                  value={confirmPassword}
                  onChangeText={(value) => setConfirmPassword(lockType === "pin" ? value.replace(/\D/g, "").slice(0, 12) : value)}
                  placeholder={lockType === "pin" ? "Enter PIN again" : "Enter password again"}
                  keyboardType={lockType === "pin" ? "number-pad" : "default"}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={styles.confirmInput}
                />
              ) : null}
            </>
          )}
          <View style={styles.actions}>
            <Button label={lockType === "pattern" && !savedPattern.length ? "Continue" : "Lock folder"} block size="lg" onPress={doSetCredential} />
            <Button label="Back" variant="ghost" block onPress={() => showMode("lockChoice")} />
          </View>
        </>
      ) : null}

      {folder && mode === "removePassword" ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <PanelHeader
            icon="lock-open-outline"
            iconColor={palette.danger}
            iconBackground={palette.dangerSoft}
            title="Remove lock?"
            subtitle="This folder will no longer require authentication to open."
            subtitleVariant="body"
          />
          {(folder.lockType ?? "password") === "device" ? (
            error ? <Text variant="footnote" color="danger" align="center">{error}</Text> : null
          ) : (folder.lockType ?? "password") === "pattern" ? (
            <>
              <PatternInput value={pattern} onChange={setPattern} />
              {error ? <Text variant="footnote" color="danger" align="center">{error}</Text> : null}
            </>
          ) : (
            <Input
              label={(folder.lockType ?? "password") === "pin" ? "Folder PIN" : "Folder password"}
              value={password}
              onChangeText={(value) => setPassword((folder.lockType ?? "password") === "pin" ? value.replace(/\D/g, "").slice(0, 12) : value)}
              placeholder={(folder.lockType ?? "password") === "pin" ? "Folder PIN" : "Folder password"}
              keyboardType={(folder.lockType ?? "password") === "pin" ? "number-pad" : "default"}
              secureTextEntry={!showPassword}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              error={error || undefined}
              onSubmitEditing={removeWithFolderPassword}
              rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
            />
          )}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Use account password"
            hitSlop={8}
            onPress={() => showMode("removePasswordAccount")}
            style={styles.forgot}
          >
            <Text variant="footnote" color="accent">Use account password</Text>
          </PressableScale>
          <View style={styles.actions}>
            <Button
              label={(folder.lockType ?? "password") === "device" ? "Use device lock" : "Remove lock"}
              variant="danger"
              block
              size="lg"
              onPress={(folder.lockType ?? "password") === "device" ? removeWithDeviceLock : removeWithFolderPassword}
              loading={removing}
            />
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
            title="Remove lock?"
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
            autoCapitalize="none"
            autoCorrect={false}
            error={error || undefined}
            onSubmitEditing={submitAccountBypass}
            textContentType="password"
            autoComplete="password"
            rightAccessory={<EyeToggle visible={showAccountPassword} onPress={() => setShowAccountPassword((value) => !value)} />}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={(folder.lockType ?? "password") === "device" ? "Use device lock" : "Use folder password"}
            hitSlop={8}
            onPress={() => showMode("removePassword")}
            style={styles.forgot}
          >
            <Text variant="footnote" color="accent">
              {(folder.lockType ?? "password") === "device"
                ? "Use device lock"
                : (folder.lockType ?? "password") === "pattern"
                  ? "Use pattern"
                  : (folder.lockType ?? "password") === "pin"
                    ? "Use folder PIN"
                    : "Use folder password"}
            </Text>
          </PressableScale>
          <View style={styles.actions}>
            <Button label="Remove lock" variant="danger" block size="lg" onPress={submitAccountBypass} loading={removing} />
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
  confirmInput: { marginTop: spacing[12] },
  staleServer: { marginTop: spacing[10] },
});
