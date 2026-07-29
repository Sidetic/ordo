/**
 * Active sessions / devices list with per-session revoke (optimistic).
 */
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../../src/components/ui/Header";
import { Text } from "../../../src/components/ui/Text";
import { Badge } from "../../../src/components/ui/Badge";
import { Button } from "../../../src/components/ui/Button";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { useSessions } from "../../../src/hooks/queries";
import { useRevokeSession } from "../../../src/hooks/use-auth-actions";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { timeAgo, formatDate } from "../../../src/lib/format";
import { errorMessage } from "../../../src/lib/error-message";
import { haptics } from "../../../src/lib/haptics";
import { toast } from "../../../src/components/ui/toast-store";
import { spacing } from "../../../src/theme/tokens";
import type { SessionDto } from "@ordo/shared";

function deviceLabel(s: SessionDto): string {
  const ua = s.deviceInfo ?? "";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/mac/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return s.deviceInfo || "This device";
}

export default function SessionsScreen() {
  const { palette } = useTheme();
  const { data: sessions, isLoading, error, refetch } = useSessions();
  const revoke = useRevokeSession();

  const onRevoke = (s: SessionDto) => {
    haptics.medium();
    revoke.mutate(s.id, {
      onSuccess: () => toast.success("Session revoked"),
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Header title="Active sessions" showBack subtitle="Devices currently signed in to your account" />

      {error && !sessions ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load sessions"
          message={errorMessage(error)}
          action={<Button label="Retry" onPress={() => refetch()} />}
        />
      ) : isLoading ? (
        <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12] }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={72} radiusKey="lg" style={{ marginBottom: spacing[10] }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sessions ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: spacing[16], paddingBottom: spacing[32] }}
          ItemSeparatorComponent={() => <View style={{ height: spacing[10] }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.cardHead}>
                <View style={[styles.iconWrap, { backgroundColor: palette.surfaceSecondary }]}>
                  <Ionicons name="hardware-chip-outline" size={18} color={palette.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text variant="bodyStrong" numberOfLines={1}>{deviceLabel(item)}</Text>
                    {item.current ? <Badge tone="accent">This device</Badge> : null}
                  </View>
                  <Text variant="footnote" color="tertiary" numberOfLines={1}>
                    {item.ip ?? "Unknown IP"} · active {timeAgo(item.lastSeenAt)}
                  </Text>
                  <Text variant="caption" color="tertiary">Signed in {formatDate(item.createdAt)}</Text>
                </View>
              </View>
              {item.current ? null : (
                <PressableScale
                  style={[styles.revokeBtn, { borderColor: palette.danger }]}
                  onPress={() => onRevoke(item)}
                >
                  {revoke.isPending && revoke.variables === item.id ? (
                    <ActivityIndicator size="small" color={palette.danger} />
                  ) : (
                    <Text variant="subhead" style={{ color: palette.danger }}>Revoke</Text>
                  )}
                </PressableScale>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="phone-portrait-outline" title="No active sessions" message="No other devices are signed in." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: spacing[14] },
  cardHead: { flexDirection: "row", gap: spacing[12], alignItems: "flex-start" },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginBottom: 2 },
  revokeBtn: { alignSelf: "flex-start", marginTop: spacing[12], paddingHorizontal: spacing[14], paddingVertical: spacing[8], borderRadius: 10, borderWidth: 1 },
});
