/** Account identity and security settings. */
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import {
  SettingsGroup,
  SettingsPage,
  SettingsScrollView,
} from "../../../src/components/settings/SettingsPage";
import { SettingRow } from "../../../src/components/ui/SettingRow";
import { Text } from "../../../src/components/ui/Text";
import { UserAvatar } from "../../../src/components/ui/UserAvatar";
import { toast } from "../../../src/components/ui/toast-store";
import { useAuthStore } from "../../../src/store/auth";
import { useServerInfo } from "../../../src/hooks/queries";
import { authApi } from "../../../src/lib/api/auth";
import { errorMessage } from "../../../src/lib/error-message";
import { formatDate } from "../../../src/lib/format";
import { haptics } from "../../../src/lib/haptics";
import { spacing } from "../../../src/theme/tokens";

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data: info } = useServerInfo();
  const [busy, setBusy] = useState(false);

  const pickAvatar = async () => {
    if (busy) return;
    const maxBytes = info?.profilePictureMaxBytes ?? 2 * 1024 * 1024;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error("Photo library permission is required to set a profile picture.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    try {
      const square = await ImageManipulator.manipulateAsync(
        picked.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileInfo = await FileSystem.getInfoAsync(square.uri);
      if (fileInfo.exists && fileInfo.size > maxBytes) {
        toast.error("That image is too large.");
        return;
      }
      const form = new FormData();
      form.append("file", {
        uri: square.uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      const updated = await authApi.uploadAvatar(form);
      setUser(updated);
      haptics.success();
      toast.success("Profile picture updated");
    } catch (e) {
      haptics.error();
      toast.error(errorMessage(e, "Couldn't upload that image."));
    } finally {
      setBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (busy || !user?.hasAvatar) return;
    setBusy(true);
    try {
      const updated = await authApi.deleteAvatar();
      setUser(updated);
      haptics.success();
      toast.success("Profile picture removed");
    } catch (e) {
      haptics.error();
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage title="Account">
      <SettingsScrollView>
        <SettingsGroup label="Profile" compact>
          <Pressable
            onPress={pickAvatar}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[16],
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[16],
            }}
          >
            <UserAvatar user={user} size={64} />
            <View style={{ flex: 1 }}>
              <Text variant="body">{busy ? "Updating…" : "Profile picture"}</Text>
              <Text variant="footnote" color="tertiary">
                Optional. Tap to choose a square photo.
              </Text>
            </View>
          </Pressable>
          {user?.hasAvatar ? (
            <SettingRow
              icon="trash-outline"
              label="Remove photo"
              destructive
              onPress={removeAvatar}
              divider={false}
            />
          ) : null}
        </SettingsGroup>

        <SettingsGroup label="Account details" compact>
          <SettingRow
            icon="person-outline"
            label="Display name"
            value={user?.displayName ?? "—"}
            onPress={() => router.push("/settings/display-name")}
            showChevron
          />
          <SettingRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? "—"}
            onPress={() => router.push("/settings/email")}
            showChevron
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Password"
            value="*****"
            onPress={() => router.push("/settings/password")}
            showChevron
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Authenticator"
            value={user?.mfaEnabled ? "On" : "Off"}
            onPress={() => router.push("/settings/security")}
            showChevron
          />
          <SettingRow
            icon="calendar-outline"
            label="Member since"
            value={user ? formatDate(user.createdAt) : "—"}
            divider={false}
          />
        </SettingsGroup>

        <SettingsGroup label="Danger zone">
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            description="Permanently delete your account and data"
            destructive
            onPress={() => router.push("/settings/delete-account")}
            showChevron
            divider={false}
          />
        </SettingsGroup>
      </SettingsScrollView>
    </SettingsPage>
  );
}
