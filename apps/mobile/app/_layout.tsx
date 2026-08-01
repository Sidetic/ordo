/**
 * Root layout: installs providers (gesture, safe-area, query, theme), hydrates
 * persisted state, initialises connectivity, and gates navigation by auth status.
 *
 * Launch sequence: the native splash is held (expo-splash-screen) while fonts +
 * persisted stores hydrate. Once hydrated, the navigator mounts underneath a
 * branded "Ordo" launch overlay, the native splash is dismissed, and the overlay
 * fades out — revealing the login or bookmarks screen — once the route has
 * reconciled with the auth status and a minimum brand beat has elapsed. The
 * overlay guarantees the wrong group (e.g. login for an authenticated user) is
 * never visible during the auth redirect.
 */
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  FadeOut,
  withTiming,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";
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

// Hold the native splash as early as possible so it covers JS load + hydration
// (otherwise its auto-hide leaves a white frame before React paints).
SplashScreen.preventAutoHideAsync().catch(() => {});

// Brand beat: keep the launch overlay up for at least this long once mounted.
const MIN_SPLASH_MS = 600;

const enterFadeScale: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.9 }] },
    animations: {
      opacity: withTiming(1, { duration: 320 }),
      transform: [{ scale: withTiming(1, { duration: 320 }) }],
    },
  };
};

function BrandSplash() {
  const { palette } = useTheme();
  return (
    <Animated.View
      entering={enterFadeScale}
      exiting={FadeOut.duration(220)}
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
      <Text variant="wordmark" color="accent" style={{ fontSize: 52 }}>
        Ordo
      </Text>
    </Animated.View>
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
  const [minElapsed, setMinElapsed] = React.useState(false);

  // The branded overlay has painted — hand off from the native splash.
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  // Minimum brand display so the launch reads as intentional, not a flicker.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

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

  // The navigator stays mounted at all times; the overlay covers the brief
  // window before the redirect reconciles the route with the auth status, so the
  // wrong group (e.g. login for an already-authenticated user) never shows.
  const routeMatchesAuth =
    status !== "loading" &&
    (status === "authenticated" ? segments[0] !== "(auth)" : segments[0] === "(auth)");

  const showSplash = !routeMatchesAuth || !minElapsed;

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
      {showSplash && <BrandSplash />}
    </>
  );
}

export default function RootLayout() {
  const [booted, setBooted] = React.useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync(fontAssets);
      await Promise.all([
        useSettingsStore.getState().hydrate(),
        useFolderTokenStore.getState().hydrate(),
      ]);
      await useAuthStore.getState().hydrate();
      await useOnlineStore.getState().init();
      setBooted(true);
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>{booted ? <RootShell /> : null}</ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
