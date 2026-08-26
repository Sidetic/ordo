import { resolveFont, type FontFamily } from "../../theme/tokens";
import type { ReaderFontFamily, ReaderFontSize } from "@ordo/shared";

const FAMILY: Record<ReaderFontFamily, FontFamily> = {
  sans: "sans",
  serif: "serif",
  mono: "mono",
};

export const READER_BODY_SIZE: Record<ReaderFontSize, number> = {
  small: 15,
  medium: 17,
  large: 19,
  xlarge: 21,
};

export function resolveReaderFontFamily(family: ReaderFontFamily): FontFamily {
  return FAMILY[family];
}

export function resolveReaderFont(family: ReaderFontFamily, weight = "400"): string {
  return resolveFont(resolveReaderFontFamily(family), weight);
}
