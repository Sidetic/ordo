/**
 * Save + share an exported file (mirrors the backup-codes download helper).
 */
import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";

export async function downloadExportFile(body: string, filename: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    await Share.share({ message: body, title: "Ordo export" });
    return;
  }
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, body);
  try {
    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(path);
      await Share.share({ title: "Ordo export", message: body, url: contentUri });
      return;
    }
    await Share.share({ title: "Ordo export", url: path });
  } catch {
    await Share.share({ title: "Ordo export", message: body });
  }
}

/** Parse the filename out of a content-disposition header (fallback provided). */
export function filenameFromDisposition(header: string | null, fallbackExt: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i)?.[1];
  if (match) return match;
  const date = new Date().toISOString().slice(0, 10);
  return `ordo-export-${date}.${fallbackExt}`;
}
