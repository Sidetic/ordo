/**
 * Reader mode: distraction-free article rendering from the server's
 * sanitized HTML. Renders from cached metadata immediately; the detail
 * (HTML) is fetched in place.
 */
import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ReaderPane } from "../../../src/components/reader/ReaderPane";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookmarkId = Array.isArray(id) ? id[0] : id;

  return <ReaderPane bookmarkId={bookmarkId} />;
}
