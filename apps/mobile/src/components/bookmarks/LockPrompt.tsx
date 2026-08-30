/** Unlock prompt for device, pattern, PIN, and text folder locks. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { FolderLockType } from "@ordo/shared";
import { FloatingPanel } from "../ui/FloatingPanel";
import { PanelHeader } from "../ui/PanelHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { EyeToggle } from "../ui/EyeToggle";
import { PatternInput } from "./PatternInput";
import { useUnlockFolder } from "../../hooks/use-folders";
import { getDeviceLockCredential } from "../../lib/device-folder-lock";
import { errorMessage } from "../../lib/error-message";
import { haptics } from "../../lib/haptics";
import { spacing } from "../../theme/tokens";

export interface LockPromptProps {
  visible: boolean;
  folderId: string;
  folderName?: string;
  lockType?: FolderLockType | null;
  onDismiss: () => void;
  onUnlocked: () => void;
}

export function LockPrompt({
  visible,
  folderId,
  folderName,
  lockType = "password",
  onDismiss,
  onUnlocked,
}: LockPromptProps) {
  const unlock = useUnlockFolder();
  const [focused, setFocused] = useState(true);
  const [password, setPassword] = useState("");
  const [pattern, setPattern] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const deviceAttempted = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const reset = () => {
    setPassword("");
    setPattern([]);
    setShowPassword(false);
    setError("");
  };

  const active = visible && focused && Boolean(folderId);

  useEffect(() => {
    if (!visible) return;
    reset();
    deviceAttempted.current = false;
  }, [visible, folderId, lockType]);

  const finishUnlock = async (credential: string) => {
    await unlock.mutateAsync({ id: folderId, password: credential });
    haptics.success();
    reset();
    onUnlocked();
  };

  const submit = async () => {
    setError("");
    const credential = lockType === "pattern" ? pattern.join("-") : password;
    if (!credential || (lockType === "pattern" && pattern.length < 4)) {
      setError(lockType === "pattern" ? "Connect at least 4 dots." : `Enter the folder ${lockType === "pin" ? "PIN" : "password"}.`);
      return;
    }
    try {
      await finishUnlock(credential);
    } catch (cause) {
      haptics.error();
      setError(errorMessage(cause, lockType === "pin" ? "That PIN is incorrect." : "That password is incorrect."));
    }
  };

  const submitDeviceLock = async () => {
    setError("");
    let credential: string | null;
    try {
      credential = await getDeviceLockCredential(folderId);
    } catch {
      setError("Device authentication was cancelled or unsuccessful.");
      return;
    }
    if (!credential) {
      setError("This device no longer has the folder key. Remove the lock from the folder menu with your account password.");
      return;
    }
    try {
      await finishUnlock(credential);
    } catch (cause) {
      haptics.error();
      setError(errorMessage(cause));
    }
  };

  useEffect(() => {
    if (!active || lockType !== "device" || deviceAttempted.current) return;
    deviceAttempted.current = true;
    void submitDeviceLock();
    // Intentionally once per open — user can retry with the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lockType, folderId]);

  const close = () => {
    reset();
    onDismiss();
  };

  const methodName = lockType === "pin" ? "PIN" : lockType === "pattern" ? "pattern" : "password";
  const where = folderName ? ` ${folderName}` : " this folder";

  return (
    <FloatingPanel visible={active} onDismiss={close}>
      <PanelHeader
        icon={lockType === "device" ? "finger-print-outline" : "lock-open-outline"}
        title="Unlock folder"
        subtitle={
          lockType === "device"
            ? `Use your device lock to unlock${where}.`
            : `Enter the ${methodName} to unlock${where}.`
        }
      />
      {lockType === "device" ? (
        <Button label="Use device lock" block size="lg" onPress={submitDeviceLock} loading={unlock.isPending} />
      ) : lockType === "pattern" ? (
        <PatternInput value={pattern} onChange={setPattern} />
      ) : (
        <Input
          label={lockType === "pin" ? "PIN" : "Password"}
          value={password}
          onChangeText={(value) => setPassword(lockType === "pin" ? value.replace(/\D/g, "").slice(0, 12) : value)}
          placeholder={lockType === "pin" ? "4 to 12 digits" : "Folder password"}
          keyboardType={lockType === "pin" ? "number-pad" : "default"}
          secureTextEntry={!showPassword}
          autoFocus
          error={error || undefined}
          onSubmitEditing={submit}
          autoCapitalize="none"
          autoCorrect={false}
          rightAccessory={<EyeToggle visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
        />
      )}
      {(lockType === "pattern" || lockType === "device") && error ? (
        <Text variant="footnote" color="danger" align="center">{error}</Text>
      ) : null}
      {lockType !== "device" ? (
        <>
          <View style={{ height: spacing[20] }} />
          <Button label="Unlock" block size="lg" onPress={submit} loading={unlock.isPending} />
        </>
      ) : null}
      <View style={{ height: spacing[10] }} />
      <Button label="Cancel" variant="ghost" block onPress={close} />
    </FloatingPanel>
  );
}
