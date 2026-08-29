/**
 * Password prompt shown when accessing a protected folder. On success the
 * folder token is cached by the store and the parent refetches.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { EyeToggle } from "../ui/EyeToggle";
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
  const [showPassword, setShowPassword] = useState(false);
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
      setShowPassword(false);
      onUnlocked();
    } catch (e) {
      haptics.error();
      setError(errorMessage(e, "That password is incorrect."));
    }
  };

  const close = () => {
    setPassword("");
    setShowPassword(false);
    setError("");
    onDismiss();
  };

  return (
    <FloatingPanel visible={visible} onDismiss={close}>
      <PanelHeader
        title="Unlock folder"
        subtitle={`Enter the password to unlock${folderName ? ` ${folderName}` : ""}.`}
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Folder password"
        secureTextEntry={!showPassword}
        autoFocus
        error={error || undefined}
        onSubmitEditing={submit}
        rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
      />
      <View style={{ height: spacing[20] }} />
      <Button label="Unlock" block size="lg" onPress={submit} loading={unlock.isPending} />
      <View style={{ height: spacing[10] }} />
      <Button label="Cancel" variant="ghost" block onPress={close} />
    </FloatingPanel>
  );
}
