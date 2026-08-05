/**
 * Expo dynamic config.
 *
 * Stamps build-time git metadata into `extra.ordo` so the app can show the
 * exact commit an artifact (OTA bundle or native binary) was produced from.
 * This module is evaluated during config resolution — which happens for both
 * `eas build` (native) and `eas update` (OTA) — so the hash reflects the
 * source of whichever artifact is being produced. In dev (`expo start`) there
 * is no artifact; consumers treat a null hash as "—".
 */
const { execSync } = require("node:child_process");

/** Run a git subcommand, returning "" when git or the repo is unavailable. */
function git(args) {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const gitHash = git("rev-parse HEAD");
const gitHashShort = git("rev-parse --short HEAD");
const gitDirty = git("status --porcelain").length > 0;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Ordo",
  slug: "ordo",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-logo.png",
    resizeMode: "contain",
    backgroundColor: "#EFE7D2",
    dark: {
      image: "./assets/splash-logo.png",
      resizeMode: "contain",
      backgroundColor: "#1A1A16",
    },
  },
  newArchEnabled: false,
  updates: {
    url: "https://u.expo.dev/c044b586-2816-42c7-b564-bef8556e21da",
  },
  runtimeVersion: { policy: "fingerprint" },
  plugins: ["expo-asset", "./plugins/with-updates-channel.js", "./plugins/with-android-build.js"],
  extra: {
    eas: {
      projectId: "c044b586-2816-42c7-b564-bef8556e21da",
    },
    ordo: {
      gitHash: gitHash || null,
      gitHashShort: gitHashShort || null,
      gitDirty,
    },
  },
  owner: "imlucki",
  android: {
    package: "com.axolet.ordo",
    usesCleartextTraffic: true,
    splash: {
      image: "./assets/splash-logo.png",
      resizeMode: "native",
      backgroundColor: "#EFE7D2",
      dark: {
        image: "./assets/splash-logo.png",
        backgroundColor: "#1A1A16",
      },
    },
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon-foreground.png",
      backgroundColor: "#EFE7D2",
    },
  },
  ios: {
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
};
