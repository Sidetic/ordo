/**
 * Root layout: installs providers (gesture, safe-area, query, theme), hydrates
 * persisted state, initialises connectivity, and gates navigation by auth status.
 */
import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Font from "expo-font";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { queryClient } from "../src/lib/query-client";
import { useAuthStore } from "../src/store/auth";
import { useSettingsStore } from "../src/store/settings";
import { useFolderTokenStore } from "../src/store/folder-tokens";
import { useOnlineStore, useOnline } from "../src/lib/online";
import { scheduleProactiveRefresh } from "../src/lib/api/client";
import { ToastHost } from "../src/components/ui/ToastHost";
import { Banner } from "../src/components/ui/Banner";
import { Text } from "../src/components/ui/Text";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { fontAssets } from "../src/theme/tokens";

function Splash() {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background }}>
      <Text variant="wordmark" color="accent">Ordo</Text>
    </View>
  );
}

function ConnectionBanner() {
  const online = useOnline();
  return (
    <Banner
      visible={!online}
      message="You're offline — some actions may be unavailable."
      tone="warning"
    />
  );
}

function RootShell() {
  const { palette } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((s) => s.status);
  const tokens = useAuthStore((s) => s.tokens);

  // Gate navigation once status is resolved.
  useEffect(() => {
    if (status === "loading") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (status === "authenticated" && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [status, segments, router]);

  // Schedule a proactive token refresh whenever the session changes.
  useEffect(() => {
    if (tokens?.expiresIn) scheduleProactiveRefresh(tokens.expiresIn);
  }, [tokens?.expiresIn, tokens?.accessToken]);

  // Keep the navigator mounted at all times — tearing the <Stack> out based on
  // segments corrupts expo-router's state and renders a blank white frame. The
  // redirect happens in an effect (after the first paint), so we overlay an
  // opaque splash until the visible route reconciles with the auth status,
  // hiding the wrong group (e.g. login for an already-authenticated user).
  const routeMatchesAuth =
    status !== "loading" &&
    (status === "authenticated" ? segments[0] !== "(auth)" : segments[0] === "(auth)");

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: "slide_from_right",
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <ConnectionBanner />
      <ToastHost />
      {!routeMatchesAuth && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.background,
          }}
        >
          <Text variant="wordmark" color="accent">Ordo</Text>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync(fontAssets);
      await Promise.all([
        useSettingsStore.getState().hydrate(),
        useFolderTokenStore.getState().hydrate(),
      ]);
      await useAuthStore.getState().hydrate();
      await useOnlineStore.getState().init();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <Splash />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>
              <RootShell />
            </ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
