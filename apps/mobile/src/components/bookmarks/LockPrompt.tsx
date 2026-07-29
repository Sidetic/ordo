/**
 * Password prompt shown when accessing a protected folder. On success the
 * folder token is cached by the store and the parent refetches.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { Sheet } from "../ui/Sheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { useUnlockFolder } from "../../hooks/use-folders";
import { useFolderTokenStore } from "../../store/folder-tokens";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { spacing } from "../../theme/tokens";

export interface LockPromptProps {
  visible: boolean;
  folderId: string;
  folderName?: string;
  onDismiss: () => void;
  onUnlocked: () => void;
}

export function LockPrompt({ visible, folderId, folderName, onDismiss, onUnlocked }: LockPromptProps) {
  const unlock = useUnlockFolder();
  const setToken = useFolderTokenStore((s) => s.set);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!password) {
      setError("Enter the folder password.");
      return;
    }
    try {
      const res = await unlock.mutateAsync({ id: folderId, password });
      setToken(folderId, res.token, res.expiresIn);
      haptics.success();
      setPassword("");
      onUnlocked();
    } catch (e) {
      haptics.error();
      setError(errorMessage(e, "Incorrect password."));
    }
  };

  const close = () => {
    setPassword("");
    setError("");
    onDismiss();
  };

  return (
    <Sheet visible={visible} onDismiss={close}>
      <Text variant="title3" style={{ marginBottom: spacing[4] }}>Folder locked</Text>
      <Text variant="footnote" color="secondary" style={{ marginBottom: spacing[16] }}>
        Enter the password to unlock{folderName ? ` ${folderName}` : ""}.
      </Text>
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Folder password"
        secureTextEntry
        autoFocus
        error={error || undefined}
        onSubmitEditing={submit}
      />
      <View style={{ height: spacing[20] }} />
      <Button label="Unlock" block size="lg" onPress={submit} loading={unlock.isPending} />
      <View style={{ height: spacing[10] }} />
      <Button label="Cancel" variant="ghost" block onPress={close} />
    </Sheet>
  );
}
