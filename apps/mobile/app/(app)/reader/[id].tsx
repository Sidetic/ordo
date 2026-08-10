/**
 * Reader mode: distraction-free article rendering from cached markdown.
 * Renders instantly from the list cache; falls back to a detail fetch.
 */
import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ReaderPane } from "../../../src/components/reader/ReaderPane";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookmarkId = Array.isArray(id) ? id[0] : id;

  return <ReaderPane bookmarkId={bookmarkId} />;
}
