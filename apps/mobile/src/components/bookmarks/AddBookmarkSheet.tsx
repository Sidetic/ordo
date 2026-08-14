/**
 * Floating dialog to save a new URL. Validates + creates optimistically.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { FloatingPanel } from "../ui/FloatingPanel";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { useCreateBookmark } from "../../hooks/use-bookmarks";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { toast } from "../ui/toast-store";
import { spacing } from "../../theme/tokens";

export interface AddBookmarkSheetProps {
  visible: boolean;
  onDismiss: () => void;
  folderId: string;
  folderName?: string;
}

export function AddBookmarkSheet({ visible, onDismiss, folderId, folderName }: AddBookmarkSheetProps) {
  const create = useCreateBookmark();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setUrl("");
    setError("");
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
      await create.mutateAsync({ url: normalized, folderId });
      haptics.success();
      toast.success("Saved to" + (folderName ? ` ${folderName}` : ""));
      close();
    } catch (e) {
      haptics.error();
      setError(errorMessage(e));
    }
  };

  return (
    <FloatingPanel visible={visible} onDismiss={close}>
      <Text variant="title3" style={{ marginBottom: spacing[4] }}>Save bookmark</Text>
      {folderName ? (
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
          Saving to <Text variant="footnote" color="accent">{folderName}</Text>
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
  );
}
