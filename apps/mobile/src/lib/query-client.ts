/**
 * React Query client with sensible defaults:
 *  - staleTime so cached screens don't refetch on every focus (no flicker / SWR).
 *  - retry skips client errors (except token_expired, which the interceptor already retried).
 *  - retry pauses when offline.
 */
import { QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "./api/client";
import { useOnlineStore } from "./online";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const err = error as ApiClientError;
        if (err?.status && err.status >= 400 && err.status < 500 && !err.tokenExpired) {
          return false;
        }
        if (!useOnlineStore.getState().online) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
