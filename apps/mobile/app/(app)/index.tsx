/**
 * Folders home. Pull-to-refresh, skeleton loading, optimistic create via FAB,
 * long-press for folder actions.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Header } from "../../src/components/ui/Header";
import { FAB } from "../../src/components/ui/FAB";
import { Sheet } from "../../src/components/ui/Sheet";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { ScreenContent } from "../../src/components/ui/ScreenContent";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FolderRow } from "../../src/components/bookmarks/FolderRow";
import { FolderActionsSheet } from "../../src/components/bookmarks/FolderActionsSheet";
import { useFolders, useCreateFolder } from "../../src/hooks/use-folders";
import { useFloatingDockMetrics } from "../../src/hooks/use-floating-dock-metrics";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import { useTheme } from "../../src/theme/ThemeProvider";
import { haptics } from "../../src/lib/haptics";
import { toast } from "../../src/components/ui/toast-store";
import { errorMessage } from "../../src/lib/error-message";
import { layout, spacing } from "../../src/theme/tokens";
import type { FolderDto } from "@ordo/shared";

export default function FoldersScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { width, isTablet, isDesktop } = useResponsiveLayout();
  const {
    visible: floatingNavigation,
    sideNavigation,
    clearance: bottomClearance,
  } = useFloatingDockMetrics();
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
  const availableWidth = Math.min(width, layout.maxContentWidth) - spacing[32];
  const useTwoColumns = (isTablet || isDesktop) && availableWidth >= 560;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Folders" large />

      {error && !folders ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load folders"
            message={errorMessage(error)}
            action={<Button label="Retry" onPress={() => refetch()} />}
          />
        </ScreenContent>
      ) : isEmpty ? (
        <ScreenContent maxWidth={layout.maxContentWidth} style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="folder-open-outline"
            title="No folders yet"
            message="Create a folder to start organizing your bookmarks."
            action={<Button label="New folder" onPress={() => setCreateOpen(true)} />}
          />
        </ScreenContent>
      ) : (
        <ScreenContent maxWidth={layout.maxContentWidth} style={{ flex: 1, width: "100%" }}>
          <FlashList
            key={useTwoColumns ? "folders-grid" : "folders-list"}
            data={folders ?? []}
            keyExtractor={(f: FolderDto) => f.id}
            numColumns={useTwoColumns ? 2 : 1}
            renderItem={({ item, index }: { item: FolderDto; index: number }) => (
              <View
                style={
                  useTwoColumns
                    ? [
                        {
                          flex: 1,
                          paddingRight: index % 2 === 0 ? spacing[6] : 0,
                          paddingLeft: index % 2 === 1 ? spacing[6] : 0,
                        },
                      ]
                    : undefined
                }
              >
                <FolderRow folder={item} onPress={openFolder} onLongPress={(f) => setActionsFolder(f)} />
              </View>
            )}
            estimatedItemSize={68}
            ItemSeparatorComponent={() => <View style={{ height: spacing[10] }} />}
            contentContainerStyle={{
              paddingBottom: floatingNavigation
                ? bottomClearance
                : sideNavigation
                  ? spacing[32]
                  : spacing[96],
              paddingTop: spacing[8],
            }}
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            ListEmptyComponent={
              isLoading ? (
                <View style={{ width: "100%", paddingTop: spacing[10] }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height={56} radiusKey="lg" style={{ marginBottom: spacing[10] }} />
                  ))}
                </View>
              ) : null
            }
          />
        </ScreenContent>
      )}

      <FAB
        onPress={() => setCreateOpen(true)}
        testID="new-folder-fab"
        bottom={floatingNavigation ? bottomClearance : spacing[20]}
        maxContentWidth={layout.maxContentWidth}
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
