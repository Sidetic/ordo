/**
 * Auth API endpoints. Types come from @ordo/shared's contract.
 */
import { AuthRoutes, buildPath } from "@ordo/shared";
import { api } from "./client";

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    api.post<typeof AuthRoutes.register.response>(AuthRoutes.register.path, body, { auth: false }),

  login: ({ identifier, password }: { identifier: string; password: string }) =>
    api.post<typeof AuthRoutes.login.response>(
      AuthRoutes.login.path,
      identifier.includes("@") ? { email: identifier, password } : { identifier, password },
      { auth: false },
    ),

  me: () => api.get<typeof AuthRoutes.me.response>(AuthRoutes.me.path),

  logout: () => api.post<typeof AuthRoutes.logout.response>(AuthRoutes.logout.path),

  listSessions: () => api.get<typeof AuthRoutes.listSessions.response>(AuthRoutes.listSessions.path),

  revokeSession: (id: string) =>
    api.delete<typeof AuthRoutes.revokeSession.response>(
      buildPath(AuthRoutes.revokeSession.path, { id }),
    ),

  verifyEmail: (token: string) =>
    api.post<typeof AuthRoutes.verifyEmail.response>(
      AuthRoutes.verifyEmail.path,
      { token },
      { auth: false },
    ),

  changeUsername: (body: { newUsername: string }) =>
    api.post<typeof AuthRoutes.changeUsername.response>(AuthRoutes.changeUsername.path, body),

  requestEmailChange: (body: { currentPassword: string; newEmail: string }) =>
    api.post<typeof AuthRoutes.changeEmail.response>(AuthRoutes.changeEmail.path, body),

  resendEmailChange: () =>
    api.post<typeof AuthRoutes.resendEmailChange.response>(AuthRoutes.resendEmailChange.path),

  verifyEmailChange: (token: string) =>
    api.post<typeof AuthRoutes.verifyEmailChange.response>(
      AuthRoutes.verifyEmailChange.path,
      { token },
    ),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<typeof AuthRoutes.changePassword.response>(AuthRoutes.changePassword.path, body),

  deleteAccount: (body: { currentPassword: string; confirmation: string }) =>
    api.delete<typeof AuthRoutes.deleteAccount.response>(AuthRoutes.deleteAccount.path, { body }),
};
