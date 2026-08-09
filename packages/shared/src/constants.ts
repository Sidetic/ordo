/** Shared constants for client and server. */

/** HTTP header that tells the server this is a mobile (token-based) client. */
export const CLIENT_TYPE_HEADER = "x-client-type";
export const CLIENT_TYPE_MOBILE = "mobile";

/** Best-effort device metadata used to identify active sessions. */
export const DEVICE_NAME_HEADER = "x-device-name";
export const DEVICE_TYPE_HEADER = "x-device-type";

/** Header carrying the short-lived folder unlock token. */
export const FOLDER_TOKEN_HEADER = "x-folder-token";

/** Header carrying the opaque refresh token when not using cookies. */
export const REFRESH_TOKEN_HEADER = "x-refresh-token";

/** Cookie names for web clients. */
export const COOKIES = {
  ACCESS: "ordo_access",
  REFRESH: "ordo_refresh",
} as const;

/** Token lifetimes (milliseconds) for client-side scheduling. */
export const TOKEN_TTL = {
  ACCESS_MS: 15 * 60 * 1000, // 15 minutes
  REFRESH_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  FOLDER_MS: 10 * 60 * 1000, // 10 minutes
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_FOLDER_NAME = "All Bookmarks";

/** Query param keys. */
export const QUERY = {
  CURSOR: "cursor",
  LIMIT: "limit",
  SEARCH: "q",
  FOLDER_ID: "folderId",
  FORMAT: "format",
} as const;

export type ExportFormat = "json" | "html";
