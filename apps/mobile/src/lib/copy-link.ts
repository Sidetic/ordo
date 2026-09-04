import * as Clipboard from "expo-clipboard";
import { toast } from "../components/ui/toast-store";
import { haptics } from "./haptics";

export async function copyLink(url: string): Promise<void> {
  haptics.light();
  try {
    await Clipboard.setStringAsync(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link.");
  }
}
