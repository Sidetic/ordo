import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { extractSharedUrl } from "../lib/shared-url";
import { useAuthStore } from "../store/auth";
import { useIncomingShareStore } from "../store/incoming-share";
import { toast } from "./ui/toast-store";

/** Bridges Android ACTION_SEND intents into Ordo's existing bookmark flow. */
export function IncomingShareHandler() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const setPendingUrl = useIncomingShareStore((state) => state.setPendingUrl);
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;

    const url = extractSharedUrl(shareIntent.webUrl, shareIntent.text);
    resetShareIntent();

    if (!url) {
      toast.error("The shared text doesn't contain a valid link.");
      return;
    }

    setPendingUrl(url);
    if (status === "authenticated") router.replace("/(app)");
  }, [hasShareIntent, resetShareIntent, router, setPendingUrl, shareIntent, status]);

  useEffect(() => {
    if (error) toast.error("Ordo couldn't read the shared link.");
  }, [error]);

  return null;
}
