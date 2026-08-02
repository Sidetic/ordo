/**
 * Root layout: installs providers (gesture, safe-area, query, theme), hydrates
 * persisted state, initialises connectivity, and gates navigation by auth status.
 *
 * Launch sequence: the native splash is held (expo-splash-screen) while fonts +
 * persisted stores hydrate. Once hydrated, the navigator mounts underneath a
 * branded launch overlay that renders the Ordo logo on the theme background —
 * pixel-matched to the native splash, so the native→JS handoff is invisible.
 * The native splash is only dismissed once that overlay has painted (effect +
 * rAF), eliminating any gap frame. The overlay then stays up until the route has
 * reconciled with the auth status AND a minimum brand beat has elapsed, after
 * which it fades out smoothly — the only motion in the sequence. The overlay
 * guarantees the wrong group (e.g. login for an authenticated user) is never
 * visible during the auth redirect.
 */
import React, { useEffect } from "react";
import { Dimensions, Image } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Asset } from "expo-asset";
import Animated, { FadeOut } from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { queryClient } from "../src/lib/query-client";
import { useAuthStore } from "../src/store/auth";
import { useSettingsStore } from "../src/store/settings";
import { useFolderTokenStore } from "../src/store/folder-tokens";
import { useOnlineStore, useOnline } from "../src/lib/online";
import { scheduleProactiveRefresh } from "../src/lib/api/client";
import { ToastHost } from "../src/components/ui/ToastHost";
import { Banner } from "../src/components/ui/Banner";
import { UpdateReadyWatcher } from "../src/components/UpdateReadyWatcher";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { fontAssets } from "../src/theme/tokens";
import SPLASH_LOGO from "../assets/splash-logo.png";

const SCREEN = Dimensions.get("window");

// Hold the native splash as early as possible so it covers JS load + hydration
// (otherwise its auto-hide leaves a white frame before React paints).
SplashScreen.preventAutoHideAsync().catch(() => {});

// Brand beat: keep the launch overlay up for at least this long once mounted.
const MIN_SPLASH_MS = 600;
// Smoothness of the overlay fade-out (the only animation in the launch).
const FADE_OUT_MS = 320;

/**
 * Branded launch overlay. Renders the transparent Ordo logo full-screen
 * (`resizeMode: contain`) on the theme background — identical to the native
 * splash — so the handoff is seamless. No entering animation: it is at full
 * opacity on the first paint. Only the exit (fade-out) is animated.
 */
function BrandSplash() {
  const { palette } = useTheme();
  return (
    <Animated.View
      exiting={FadeOut.duration(FADE_OUT_MS)}
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
      <Image
        source={SPLASH_LOGO}
        style={{ width: SCREEN.width, height: SCREEN.height }}
        resizeMode="contain"
      />
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

  // The branded overlay has committed — dismiss the native splash on the next
  // frame so it has definitely painted, leaving no gap frame in between. The
  // overlay is pixel-matched to the native splash, so this handoff is invisible.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
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
          animation: "fade",
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <ConnectionBanner />
      <ToastHost />
      <UpdateReadyWatcher />
      {showSplash && <BrandSplash />}
    </>
  );
}

export default function RootLayout() {
  const [booted, setBooted] = React.useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync(fontAssets);
      // Decode the splash logo before the overlay mounts so its first paint is
      // instant and seamless with the native splash.
      await Asset.loadAsync(SPLASH_LOGO);
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
