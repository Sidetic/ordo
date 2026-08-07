/**
 * Folders home. Pull-to-refresh, skeleton loading, optimistic create via FAB,
 * long-press for folder actions.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Header } from "../../src/components/ui/Header";
import { FAB } from "../../src/components/ui/FAB";
import { Sheet } from "../../src/components/ui/Sheet";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FolderRow } from "../../src/components/bookmarks/FolderRow";
import { FolderActionsSheet } from "../../src/components/bookmarks/FolderActionsSheet";
import { useFolders, useCreateFolder } from "../../src/hooks/use-folders";
import { useTheme } from "../../src/theme/ThemeProvider";
import { haptics } from "../../src/lib/haptics";
import { toast } from "../../src/components/ui/toast-store";
import { errorMessage } from "../../src/lib/error-message";
import { spacing } from "../../src/theme/tokens";
import { useSettingsStore } from "../../src/store/settings";
import type { FolderDto } from "@ordo/shared";

export default function FoldersScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const floatingNavigation = useSettingsStore((s) => s.navigationStyle === "floating");
  const bottomClearance = spacing[96] + Math.max(insets.bottom - spacing[12], 0);
  const { data: folders, isLoading, isFetching, refetch, error } = useFolders();
  const create = useCreateFolder();

  const [createOpen, setCreateOpen] = useState(false);
  const [actionsFolder, setActionsFolder] = useState<FolderDto | null>(null);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");

  const openFolder = (f: FolderDto) => router.push(`/folder/${f.id}`);

  const submitCreate = async () => {
    setCreateError("");
    const name = newName.trim();
    if (!name) {
      setCreateError("Enter a folder name.");
      return;
    }
    try {
      await create.mutateAsync(name);
      haptics.success();
      setNewName("");
      setCreateOpen(false);
    } catch (e) {
      setCreateError(errorMessage(e));
    }
  };

  const isEmpty = !isLoading && (folders?.length ?? 0) === 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Folders" large />

      {error && !folders ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load folders"
          message={errorMessage(error)}
          action={<Button label="Retry" onPress={() => refetch()} />}
        />
      ) : isEmpty ? (
        <EmptyState
          icon="folder-open-outline"
          title="No folders yet"
          message="Create a folder to start organizing your bookmarks."
          action={<Button label="New folder" onPress={() => setCreateOpen(true)} />}
        />
      ) : (
        <FlashList
          data={folders ?? []}
          keyExtractor={(f: FolderDto) => f.id}
          renderItem={({ item }: { item: FolderDto }) => (
            <FolderRow folder={item} onPress={openFolder} onLongPress={(f) => setActionsFolder(f)} />
          )}
          estimatedItemSize={68}
          ItemSeparatorComponent={() => <View style={{ height: spacing[10] }} />}
          contentContainerStyle={{
            paddingHorizontal: spacing[16],
            paddingBottom: floatingNavigation ? bottomClearance : spacing[96],
          }}
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[10] }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={56} radiusKey="lg" style={{ marginBottom: spacing[10] }} />
                ))}
              </View>
            ) : null
          }
        />
      )}

      <FAB
        onPress={() => setCreateOpen(true)}
        testID="new-folder-fab"
        bottom={floatingNavigation ? bottomClearance : spacing[20]}
      />

      <Sheet visible={createOpen} onDismiss={() => setCreateOpen(false)}>
        <Text variant="title3" style={{ marginBottom: spacing[16] }}>New folder</Text>
        <Input
          label="Name"
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. Recipes"
          autoFocus
          error={createError || undefined}
          onSubmitEditing={submitCreate}
        />
        <View style={{ height: spacing[20] }} />
        <Button label="Create" block size="lg" onPress={submitCreate} loading={create.isPending} />
        <View style={{ height: spacing[10] }} />
        <Button label="Cancel" variant="ghost" block onPress={() => setCreateOpen(false)} />
      </Sheet>

      <FolderActionsSheet
        visible={!!actionsFolder}
        folder={actionsFolder}
        onDismiss={() => setActionsFolder(null)}
        onDeleted={(id) => {
          toast.success("Folder deleted");
          setActionsFolder(null);
          void id;
        }}
      />
    </View>
  );
}
