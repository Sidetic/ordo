/**
 * Floating dialog to validate and save a new URL.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { LockPrompt } from "./LockPrompt";
import { CreateFolderPanel } from "./CreateFolderPanel";
import {
  SettingsSelect,
  type SettingsSelectOption,
} from "../settings/SettingsSelect";
import { useCreateBookmark } from "../../hooks/use-bookmarks";
import { useFolders } from "../../hooks/queries";
import { errorMessage, isFolderProtected } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { spacing } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export interface AddBookmarkSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Target folder, or null to save unfiled (root "Bookmarks"). */
  folderId: string | null;
  folderName?: string | null;
  allowFolderSelection?: boolean;
  initialUrl?: string;
}

const ROOT_DESTINATION = "__bookmarks__";
const NEW_FOLDER_DESTINATION = "__new_folder__";

/** Display name for the save destination; unfiled bookmarks land in "Bookmarks". */
function destinationLabel(folderId: string | null, folderName?: string | null): string | null {
  if (folderName) return folderName;
  return folderId === null ? "Bookmarks" : null;
}

export function AddBookmarkSheet({
  visible,
  onDismiss,
  folderId,
  folderName,
  allowFolderSelection = false,
  initialUrl,
}: AddBookmarkSheetProps) {
  const { palette } = useTheme();
  const create = useCreateBookmark();
  const { data: folders } = useFolders();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [lockedFolderId, setLockedFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(folderId ?? ROOT_DESTINATION);
  const selectedFolderId = selectedDestination === ROOT_DESTINATION ? null : selectedDestination;
  const selectedFolder = folders?.find((folder) => folder.id === selectedFolderId);
  const destination = destinationLabel(
    selectedFolderId,
    allowFolderSelection ? selectedFolder?.name : folderName,
  );
  const destinationOptions: SettingsSelectOption<string>[] = [
    { value: ROOT_DESTINATION, label: "Bookmarks", icon: "bookmark-outline" },
    ...(folders ?? []).map((folder) => ({
      value: folder.id,
      label: folder.name,
      icon: folder.icon,
    })),
    { value: NEW_FOLDER_DESTINATION, label: "New folder", icon: "add" },
  ];

  const chooseDestination = (value: string) => {
    if (value === NEW_FOLDER_DESTINATION) {
      setCreateFolderOpen(true);
      return;
    }
    setSelectedDestination(value);
  };

  React.useEffect(() => {
    if (!visible) return;
    setSelectedDestination(folderId ?? ROOT_DESTINATION);
    setUrl(initialUrl ?? "");
    setError("");
  }, [folderId, initialUrl, visible]);

  const reset = () => {
    setUrl("");
    setError("");
    setLockedFolderId(null);
    setSelectedDestination(folderId ?? ROOT_DESTINATION);
  };

  const close = () => {
    reset();
    onDismiss();
  };

  const submit = async () => {
    if (create.isPending) return;
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL.");
      return;
    }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    try {
      new URL(normalized);
    } catch {
      setError("Enter a valid URL.");
      return;
    }
    try {
      await create.mutateAsync({ url: normalized, folderId: selectedFolderId });
      haptics.success();
      toast.success(destination ? `Saved to ${destination}` : "Saved");
      close();
    } catch (e) {
      if (selectedFolderId && isFolderProtected(e)) {
        setLockedFolderId(selectedFolderId);
        return;
      }
      haptics.error();
      setError(errorMessage(e));
    }
  };

  const lockedFolder = folders?.find((folder) => folder.id === lockedFolderId);

  return (
    <>
    <FloatingPanel visible={visible && !lockedFolderId} onDismiss={close}>
      <PanelHeader title="Save bookmark" />
      {allowFolderSelection ? (
        <View style={styles.destinationRow}>
          <Text variant="label" color="tertiary">DESTINATION</Text>
          <SettingsSelect
            value={selectedDestination}
            options={destinationOptions}
            onChange={chooseDestination}
            title="Save to"
          />
        </View>
      ) : destination ? (
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
          Saving to <Text variant="footnote" color="accent">{destination}</Text>
        </Text>
      ) : null}

      <Input
        value={url}
        onChangeText={setUrl}
        placeholder="Paste a link"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        error={error || undefined}
        icon={<Ionicons name="link-outline" size={18} color={palette.textTertiary} />}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
      />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={close} style={styles.action} />
        <Button label="Save" onPress={submit} loading={create.isPending} style={styles.saveAction} />
      </View>
    </FloatingPanel>
    <LockPrompt
      visible={visible && !!lockedFolderId}
      folderId={lockedFolderId ?? ""}
      folderName={lockedFolder?.name}
      lockType={lockedFolder?.lockType}
      onDismiss={() => setLockedFolderId(null)}
      onUnlocked={() => {
        setLockedFolderId(null);
        void submit();
      }}
    />
    <CreateFolderPanel
      visible={createFolderOpen}
      onDismiss={() => setCreateFolderOpen(false)}
      onCreated={(folder) => setSelectedDestination(folder.id)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    marginBottom: spacing[16],
  },
  actions: {
    flexDirection: "row",
    gap: spacing[10],
    marginTop: spacing[20],
  },
  action: { flex: 1 },
  saveAction: { flex: 1.4 },
});
