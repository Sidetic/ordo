/**
 * Floating dialog to save a new URL. Validates + creates optimistically.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { LockPrompt } from "./LockPrompt";
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

export interface AddBookmarkSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Target folder, or null to save unfiled (root "Bookmarks"). */
  folderId: string | null;
  folderName?: string | null;
  allowFolderSelection?: boolean;
}

const ROOT_DESTINATION = "__bookmarks__";

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
}: AddBookmarkSheetProps) {
  const create = useCreateBookmark();
  const { data: folders } = useFolders();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [lockedFolderId, setLockedFolderId] = useState<string | null>(null);
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
  ];

  React.useEffect(() => {
    if (visible) setSelectedDestination(folderId ?? ROOT_DESTINATION);
  }, [folderId, visible]);

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
      setError("That doesn't look like a valid URL.");
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

  return (
    <>
    <FloatingPanel visible={visible && !lockedFolderId} onDismiss={close}>
      <Text variant="title3" style={{ marginBottom: spacing[4] }}>Save bookmark</Text>
      {allowFolderSelection ? (
        <View style={styles.destinationRow}>
          <Text variant="label" color="tertiary">SAVE TO</Text>
          <SettingsSelect
            value={selectedDestination}
            options={destinationOptions}
            onChange={setSelectedDestination}
            title="Save to"
          />
        </View>
      ) : destination ? (
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
          Saving to <Text variant="footnote" color="accent">{destination}</Text>
        </Text>
      ) : null}

      <Input
        label="URL"
        value={url}
        onChangeText={setUrl}
        placeholder="https://example.com/article"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        error={error || undefined}
        helper={error ? undefined : "Paste any link — we'll fetch the article for clean reading."}
      />

      <View style={{ height: spacing[20] }} />
      <Button label="Save" block size="lg" onPress={submit} loading={create.isPending} />
      <View style={{ height: spacing[10] }} />
      <Button label="Cancel" variant="ghost" block onPress={close} />
    </FloatingPanel>
    <LockPrompt
      visible={visible && !!lockedFolderId}
      folderId={lockedFolderId ?? ""}
      folderName={folders?.find((folder) => folder.id === lockedFolderId)?.name}
      onDismiss={() => setLockedFolderId(null)}
      onUnlocked={() => {
        setLockedFolderId(null);
        void submit();
      }}
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
    marginTop: spacing[12],
    marginBottom: spacing[16],
  },
});
