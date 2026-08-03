/**
 * Ordo brand mark for in-app branding (e.g. the auth screens). Uses a tight
 * crop of the transparent logo so the coral mark sits compactly on the themed
 * background. Height follows the asset's aspect ratio from the given width.
 */
import React from "react";
import { Image, StyleSheet } from "react-native";
import LOGO_MARK from "../../../assets/logo-mark.png";

const ASPECT = 468 / 509;

export interface LogoProps {
  /** Rendered width in px; height follows the mark's aspect ratio. Defaults to 56. */
  width?: number;
}

export function Logo({ width = 56 }: LogoProps) {
  return (
    <Image
      source={LOGO_MARK}
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
