/**
 * Typed API contract: one source of truth for every endpoint's path, method,
 * request body, params, query, and response shape. Both the server's
 * controllers and the mobile API client import from here.
 */
import type {
  AuthResponse,
  AuthTokens,
  BookmarkDetailDto,
  BookmarkDto,
  CursorPage,
  FolderDto,
  ServerInfoDto,
  SessionDto,
  UserDto,
} from "./types.js";
import type { ExportFormat } from "./constants.js";

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
    body: {} as { email: string; password: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as AuthResponse,
  },
  login: {
    path: `${API_PREFIX}/auth/login`,
    method: "POST",
    body: {} as { email: string; password: string },
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
    body: {} as { token: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as { success: true },
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
    body: {} as { name: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as FolderDto,
  },
  update: {
    path: `${API_PREFIX}/folders/:id`,
    method: "PATCH",
    body: {} as { name: string },
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
    body: {} as Empty,
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
  export: {
    path: `${API_PREFIX}/folders/:id/export`,
    method: "GET",
    body: {} as Empty,
    query: {} as { format: ExportFormat },
    params: {} as { id: string },
    response: {} as unknown,
  },
} satisfies Record<string, RouteDef>;

// ---------- Bookmarks ----------
export const BookmarkRoutes = {
  create: {
    path: `${API_PREFIX}/bookmarks`,
    method: "POST",
    body: {} as { url: string; folderId: string },
    query: {} as Empty,
    params: {} as Empty,
    response: {} as BookmarkDto,
  },
  list: {
    path: `${API_PREFIX}/bookmarks`,
    method: "GET",
    body: {} as Empty,
    query: {} as { folderId: string; cursor?: string; limit?: number },
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
    body: {} as { folderId?: string; isRead?: boolean },
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
    body: {} as { folderId: string },
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
