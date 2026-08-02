/**
 * Ordo brand mark — the transparent logo used for in-app branding (e.g. the
 * auth screens). The asset is the same transparent variant used on the splash,
 * so the mark sits cleanly on the themed background. Height follows the logo's
 * native aspect ratio from the given width.
 */
import React from "react";
import { Image, StyleSheet } from "react-native";
import SPLASH_LOGO from "../../../assets/splash-logo.png";

const ASPECT = 531 / 702;

export interface LogoProps {
  /** Rendered width in px; height follows the logo's aspect ratio. Defaults to 80. */
  width?: number;
}

export function Logo({ width = 80 }: LogoProps) {
  return (
    <Image
      source={SPLASH_LOGO}
      style={[styles.logo, { width, aspectRatio: ASPECT }]}
      resizeMode="contain"
      accessibilityLabel="Ordo"
      accessibilityRole="image"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: "center",
  },
});
