/**
 * Live count of bookmarks whose article text is still being fetched.
 */
import { useQuery } from "@tanstack/react-query";
import { bookmarksApi } from "../lib/api/bookmarks";
import { qk } from "../lib/api/query-keys";

const POLL_MS = 1_500;

export function useExtractionProgress() {
  return useQuery({
    queryKey: qk.extractionProgress,
    queryFn: bookmarksApi.extractionProgress,
    refetchInterval: (query) => ((query.state.data?.pending ?? 0) > 0 ? POLL_MS : false),
  });
}
