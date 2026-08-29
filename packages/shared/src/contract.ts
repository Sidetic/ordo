/**
 * Typed API contract: one source of truth for every endpoint's path, method,
 * request body, params, query, and response shape. Both the server's
 * controllers and the mobile API client import from here.
 */
import type {
  AuthResponse,
  AuthTokens,
  BackupCodesDto,
  BookmarkDetailDto,
  BookmarkDto,
  CursorPage,
  FolderDto,
  LoginResponse,
  MfaStatusDto,
  ServerInfoDto,
  SessionDto,
  TotpBeginDto,
  TotpConfirmDto,
  UserDto,
} from "./types.js";
import type {
  CreateFolderInput,
  RemoveFolderPasswordInput,
  UpdateFolderInput,
  UpdateReaderPreferencesInput,
} from "./schemas/index.js";

export const API_PREFIX = "/api";

type Empty = Record<string, never>;

export interface RouteDef<
  TPath extends string = string,
  TMethod extends string = string,
  TBody = unknown,
  TQuery = Record<string, unknown>,
  TParams = Record<string, unknown>,
  TResponse = unknown,
> {
  path: TPath;
  method: TMethod;
  body: TBody;
  query: TQuery;
  params: TParams;
  response: TResponse;
}

// ---------- Auth ----------
export const AuthRoutes = {
  register: {
    path: `${API_PREFIX}/auth/register`,
    method: "POST",
    body: {} as { displayName: string; email: string; password: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  login: {
    path: `${API_PREFIX}/auth/login`,
    method: "POST",
    body: {} as
      | { identifier: string; password: string }
      | { email: string; password: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as LoginResponse,
  },
  loginMfa: {
    path: `${API_PREFIX}/auth/login/mfa`,
    method: "POST",
    body: {} as { challengeToken: string; code: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  loginMfaEmail: {
    path: `${API_PREFIX}/auth/login/mfa/email`,
    method: "POST",
    body: {} as { challengeToken: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  loginMfaEmailVerify: {
    path: `${API_PREFIX}/auth/login/mfa/email/verify`,
    method: "POST",
    body: {} as { challengeToken: string; token: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  refresh: {
    path: `${API_PREFIX}/auth/refresh`,
    method: "POST",
    body: {} as { refreshToken?: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  logout: {
    path: `${API_PREFIX}/auth/logout`,
    method: "POST",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  me: {
    path: `${API_PREFIX}/auth/me`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  listSessions: {
    path: `${API_PREFIX}/auth/sessions`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as SessionDto[],
  },
  revokeSession: {
    path: `${API_PREFIX}/auth/sessions/:id`,
    method: "DELETE",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { success: true },
  },
  verifyEmail: {
    path: `${API_PREFIX}/auth/verify-email`,
    method: "POST",
    body: {} as { email: string; token: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  changeDisplayName: {
    path: `${API_PREFIX}/auth/display-name`,
    method: "POST",
    body: {} as { displayName: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  changeEmail: {
    path: `${API_PREFIX}/auth/email/change`,
    method: "POST",
    body: {} as { currentPassword: string; newEmail: string; mfaCode?: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  resendEmailChange: {
    path: `${API_PREFIX}/auth/email/change/resend`,
    method: "POST",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  verifyEmailChange: {
    path: `${API_PREFIX}/auth/email/verify-change`,
    method: "POST",
    body: {} as { token: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  changePassword: {
    path: `${API_PREFIX}/auth/password`,
    method: "POST",
    body: {} as { currentPassword: string; newPassword: string; mfaCode?: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  forgotPassword: {
    path: `${API_PREFIX}/auth/forgot-password`,
    method: "POST",
    body: {} as { email: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  resetPassword: {
    path: `${API_PREFIX}/auth/reset-password`,
    method: "POST",
    body: {} as { email: string; token: string; newPassword: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  updatePreferences: {
    path: `${API_PREFIX}/auth/preferences`,
    method: "PATCH",
    body: {} as UpdateReaderPreferencesInput,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  deleteAccount: {
    path: `${API_PREFIX}/auth/account`,
    method: "DELETE",
    body: {} as { currentPassword: string; confirmation: string; mfaCode?: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
  },
  mfaStatus: {
    path: `${API_PREFIX}/auth/mfa`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as MfaStatusDto,
  },
  totpBegin: {
    path: `${API_PREFIX}/auth/mfa/totp/begin`,
    method: "POST",
    body: {} as { mfaCode?: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as TotpBeginDto,
  },
  totpConfirm: {
    path: `${API_PREFIX}/auth/mfa/totp/confirm`,
    method: "POST",
    body: {} as { code: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as TotpConfirmDto,
  },
  totpDisable: {
    path: `${API_PREFIX}/auth/mfa/totp/disable`,
    method: "POST",
    body: {} as { mfaCode: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  regenerateBackupCodes: {
    path: `${API_PREFIX}/auth/mfa/backup-codes/regenerate`,
    method: "POST",
    body: {} as { mfaCode: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as BackupCodesDto,
  },
  uploadAvatar: {
    path: `${API_PREFIX}/auth/avatar`,
    method: "POST",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
  getAvatar: {
    path: `${API_PREFIX}/auth/avatar`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as Empty,
  },
  deleteAvatar: {
    path: `${API_PREFIX}/auth/avatar`,
    method: "DELETE",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as UserDto,
  },
} satisfies Record<string, RouteDef>;

// ---------- Folders ----------
export const FolderRoutes = {
  list: {
    path: `${API_PREFIX}/folders`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as FolderDto[],
  },
  create: {
    path: `${API_PREFIX}/folders`,
    method: "POST",
    body: {} as CreateFolderInput,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as FolderDto,
  },
  update: {
    path: `${API_PREFIX}/folders/:id`,
    method: "PATCH",
    body: {} as UpdateFolderInput,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as FolderDto,
  },
  remove: {
    path: `${API_PREFIX}/folders/:id`,
    method: "DELETE",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { success: true },
  },
  setPassword: {
    path: `${API_PREFIX}/folders/:id/password`,
    method: "POST",
    body: {} as { password: string },
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { success: true },
  },
  removePassword: {
    path: `${API_PREFIX}/folders/:id/password`,
    method: "DELETE",
    body: {} as RemoveFolderPasswordInput,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { success: true },
  },
  unlock: {
    path: `${API_PREFIX}/folders/:id/unlock`,
    method: "POST",
    body: {} as { password: string },
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { token: string; expiresIn: number },
  },
} satisfies Record<string, RouteDef>;

// ---------- Bookmarks ----------
export const BookmarkRoutes = {
  create: {
    path: `${API_PREFIX}/bookmarks`,
    method: "POST",
    body: {} as { url: string; folderId?: string | null },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as BookmarkDto,
  },
  list: {
    path: `${API_PREFIX}/bookmarks`,
    method: "GET",
    body: {} as Empty,
    query: {} as { folderId?: string | null; cursor?: string; limit?: number },
    params: {} as Empty,
    response: {} as CursorPage<BookmarkDto>,
  },
  search: {
    path: `${API_PREFIX}/bookmarks/search`,
    method: "GET",
    body: {} as Empty,
    query: {} as { q: string; cursor?: string; limit?: number },
    params: {} as Empty,
    response: {} as CursorPage<BookmarkDto>,
  },
  detail: {
    path: `${API_PREFIX}/bookmarks/:id`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as BookmarkDetailDto,
  },
  update: {
    path: `${API_PREFIX}/bookmarks/:id`,
    method: "PATCH",
    body: {} as { folderId?: string | null; isRead?: boolean; readProgress?: number },
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as BookmarkDto,
  },
  remove: {
    path: `${API_PREFIX}/bookmarks/:id`,
    method: "DELETE",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as { id: string },
    response: {} as { success: true },
  },
  markAllRead: {
    path: `${API_PREFIX}/bookmarks/mark-all-read`,
    method: "POST",
    body: {} as { folderId?: string | null },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { updated: number },
  },
} satisfies Record<string, RouteDef>;

// ---------- Server ----------
export const ServerRoutes = {
  info: {
    path: `${API_PREFIX}/server/info`,
    method: "GET",
    body: {} as Empty,
    query: {} as Empty,
    params: {} as Empty,
    response: {} as ServerInfoDto,
  },
} satisfies Record<string, RouteDef>;

/** Helper to build a concrete path from a route path with :params. */
export function buildPath(path: string, params: Record<string, string>): string {
  let out = path;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`:${key}`, encodeURIComponent(value));
  }
  return out;
}

export type { AuthTokens };
