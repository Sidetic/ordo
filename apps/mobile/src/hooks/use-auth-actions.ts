/**
 * Auth mutations. On success they update the auth store, which flips the root
 * gate. Errors are surfaced via the returned rejection (screens handle UI).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { authApi } from "../lib/api/auth";
import { useAuthStore } from "../store/auth";
import { useFolderTokenStore } from "../store/folder-tokens";
import { qk } from "../lib/api/query-keys";
import { cancelProactiveRefresh, scheduleProactiveRefresh } from "../lib/api/client";
import type { SessionDto, UserDto } from "@ordo/shared";

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

/** Write an updated user into the auth store + the `me` query cache. */
function useUpdateUser() {
  const setUser = useAuthStore((s) => s.setUser);
  return (user: UserDto) => {
    setUser(user);
    queryClient.setQueryData<UserDto>(qk.me, user);
  };
}

export function useChangeUsername() {
  const updateUser = useUpdateUser();
  return useMutation({
    mutationFn: authApi.changeUsername,
    onSuccess: updateUser,
  });
}

export function useRequestEmailChange() {
  return useMutation({ mutationFn: authApi.requestEmailChange });
}

export function useResendEmailChange() {
  return useMutation({ mutationFn: authApi.resendEmailChange });
}

export function useVerifyEmailChange() {
  const updateUser = useUpdateUser();
  return useMutation({
    mutationFn: authApi.verifyEmailChange,
    onSuccess: updateUser,
  });
}

export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (data) => {
      setSession(data);
      scheduleProactiveRefresh(data.tokens.expiresIn);
      void qc.invalidateQueries({ queryKey: qk.sessions });
    },
  });
}

export function useDeleteAccount() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: async () => {
      cancelProactiveRefresh();
      const cleanup = Promise.allSettled([
        clear(),
        useFolderTokenStore.getState().clearAll(),
      ]);
      queryClient.clear();
      await cleanup;
    },
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.revokeSession,
    onMutate: (id) => {
      const prev = qc.getQueryData<SessionDto[]>(qk.sessions);
      qc.setQueryData<SessionDto[]>(qk.sessions, (old) => (old ?? []).filter((s) => s.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.sessions, ctx.prev);
    },
  });
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
      void clear();
      queryClient.clear();
    },
  });
}
