/**
 * Auth mutations. On success they update the auth store, which flips the root
 * gate. Errors are surfaced via the returned rejection (screens handle UI).
 */
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { authApi } from "../lib/api/auth";
import { useAuthStore } from "../store/auth";
import { cancelProactiveRefresh, scheduleProactiveRefresh } from "../lib/api/client";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data);
      scheduleProactiveRefresh(data.tokens.expiresIn);
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data);
      scheduleProactiveRefresh(data.tokens.expiresIn);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authApi.verifyEmail });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        /* logout is best-effort; if the access token is already expired the
           server returns 401 — we discard local state regardless. */
      }
    },
    onSettled: () => {
      cancelProactiveRefresh();
      clear();
      queryClient.clear();
    },
  });
}
