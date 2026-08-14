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

/** Icon used when a folder is created without an explicit icon. */
export const DEFAULT_FOLDER_ICON = "folder-outline";

/**
 * Curated Ionicons (outline variants) offered as folder icons.
 * Keep names in sync with the Ionicons set used by the mobile app.
 */
export const FOLDER_ICONS = [
  // general & reading
  "folder-outline",
  "bookmark-outline",
  "book-outline",
  "reader-outline",
  "newspaper-outline",
  "library-outline",
  "star-outline",
  "heart-outline",
  "sparkles-outline",
  // travel & places
  "globe-outline",
  "compass-outline",
  "map-outline",
  "location-outline",
  "airplane-outline",
  "car-outline",
  "bicycle-outline",
  "boat-outline",
  "home-outline",
  "business-outline",
  // work & tech
  "briefcase-outline",
  "laptop-outline",
  "server-outline",
  "cloud-outline",
  "code-slash-outline",
  "terminal-outline",
  "bug-outline",
  "rocket-outline",
  "construct-outline",
  "hardware-chip-outline",
  "cube-outline",
  // media
  "albums-outline",
  "images-outline",
  "camera-outline",
  "videocam-outline",
  "film-outline",
  "musical-notes-outline",
  "headset-outline",
  "mic-outline",
  // fun & lifestyle
  "game-controller-outline",
  "extension-puzzle-outline",
  "fitness-outline",
  "barbell-outline",
  "medical-outline",
  "restaurant-outline",
  "cafe-outline",
  "wine-outline",
  "cart-outline",
  "pricetags-outline",
  "wallet-outline",
  "cash-outline",
  // people & communication
  "people-outline",
  "person-outline",
  "chatbubbles-outline",
  "mail-outline",
  "share-social-outline",
] as const;

export type FolderIcon = (typeof FOLDER_ICONS)[number];

export function normalizeFolderIcon(value: unknown): FolderIcon {
  return typeof value === "string" && (FOLDER_ICONS as readonly string[]).includes(value)
    ? (value as FolderIcon)
    : DEFAULT_FOLDER_ICON;
}

/** Query param keys. */
export const QUERY = {
  CURSOR: "cursor",
  LIMIT: "limit",
  SEARCH: "q",
  FOLDER_ID: "folderId",
} as const;
