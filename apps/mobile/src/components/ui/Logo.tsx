/**
 * Ordo brand mark — the opaque logo used for in-app branding (e.g. the auth
 * screens). Renders the source asset with `resizeMode: contain`, so any size is
 * honoured without cropping.
 */
import React from "react";
import { Image, StyleSheet } from "react-native";
import LOGO from "../../../assets/logo.png";

export interface LogoProps {
  /** Rendered edge length (the mark is square). Defaults to 64. */
  size?: number;
}

export function Logo({ size = 64 }: LogoProps) {
  return (
    <Image
      source={LOGO}
      style={[styles.logo, { width: size, height: size }]}
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
