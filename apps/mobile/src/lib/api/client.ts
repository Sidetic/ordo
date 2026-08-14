/**
 * Core HTTP client for the Ordo API.
 *
 * Responsibilities:
 *  - Prefix requests with the configured server URL.
 *  - Always send `x-client-type: mobile` (required so the server returns tokens
 *    in the body instead of httpOnly cookies).
 *  - Attach `Authorization: Bearer <accessToken>` for authed requests.
 *  - Attach `x-folder-token` for requests targeting a (possibly) protected folder.
 *  - Transparently refresh on `token_expired` (single-flight) and replay once.
 *  - Normalise every failure into an `ApiClientError` with a stable `code`.
 *  - Schedule a proactive refresh just before the access token expires.
 */
import {
  AuthRoutes,
  CLIENT_TYPE_HEADER,
  CLIENT_TYPE_MOBILE,
  DEVICE_NAME_HEADER,
  DEVICE_TYPE_HEADER,
  FOLDER_TOKEN_HEADER,
  REFRESH_TOKEN_HEADER,
  type ApiError,
  type SessionDeviceType,
} from "@ordo/shared";
import * as Device from "expo-device";
import { useAuthStore } from "../../store/auth";
import { useFolderTokenStore } from "../../store/folder-tokens";
import { useSettingsStore } from "../../store/settings";

/** Client-side error codes not present on the wire. */
export const LOCAL_ERROR = {
  NETWORK: "network_error",
  TIMEOUT: "request_timeout",
  UNKNOWN: "unknown_error",
} as const;

/** A normalised, human-consumable API error. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, body: ApiError | null, fallbackMessage?: string) {
    super(body?.message || fallbackMessage || "Something went wrong");
    this.name = "ApiClientError";
    this.code = body?.code ?? (status === 0 ? LOCAL_ERROR.NETWORK : LOCAL_ERROR.UNKNOWN);
    this.status = status;
    this.details = body?.details;
  }

  /** True when the access token has expired and a refresh should be attempted. */
  get tokenExpired() {
    return this.status === 401 && this.code === "token_expired";
  }
  /** True when the session is gone and the user must re-authenticate. */
  get sessionGone() {
    return (
      this.code === "session_revoked" ||
      (this.status === 401 && (this.code === "unauthorized" || this.code === "session_revoked"))
    );
  }
}

export interface RequestOptions<B = unknown> {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: B;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Attach the current access token (default: true). */
  auth?: boolean;
  /** If set (non-null), attach the cached folder unlock token for this folder (if any). */
  folderId?: string | null;
  signal?: AbortSignal;
}

function baseUrl(): string {
  return (useSettingsStore.getState().serverUrl || "").replace(/\/+$/, "");
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${baseUrl()}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Parse the server's `{ error: {...} }` envelope if present. */
async function parseError(res: Response): Promise<ApiClientError> {
  let body: ApiError | null = null;
  try {
    const data = await res.clone().json();
    body = data?.error ?? null;
  } catch {
    /* not JSON */
  }
  return new ApiClientError(res.status, body);
}

/** Lowest-level fetch: no interceptors, just normalised errors. */
async function rawFetch(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw new ApiClientError(
      0,
      null,
      aborted ? "Request cancelled" : "Couldn't reach the server. Check your connection.",
    );
  }
  if (!res.ok) throw await parseError(res);
  return res;
}

function jsonHeaders(extra: Record<string, string>): Record<string, string> {
  return { "content-type": "application/json", accept: "application/json", ...extra };
}

function deviceHeaders(): Record<string, string> {
  const types: Partial<Record<Device.DeviceType, SessionDeviceType>> = {
    [Device.DeviceType.PHONE]: "phone",
    [Device.DeviceType.TABLET]: "tablet",
    [Device.DeviceType.DESKTOP]: "desktop",
    [Device.DeviceType.TV]: "tv",
  };
  const name = Device.deviceName || Device.modelName || Device.osName || "Unknown device";

  return {
    [DEVICE_NAME_HEADER]: encodeURIComponent(name),
    [DEVICE_TYPE_HEADER]: types[Device.deviceType ?? Device.DeviceType.UNKNOWN] ?? "unknown",
  };
}

/* ------------------------------------------------------------------ */
/* Refresh: single-flight so concurrent 401s share one refresh.        */
/* ------------------------------------------------------------------ */

let refreshInFlight: Promise<boolean> | null = null;
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

async function doRefresh(): Promise<boolean> {
  const { tokens, setTokens, clear } = useAuthStore.getState();
  const refreshToken = tokens?.refreshToken;
  if (!refreshToken) {
    void clear();
    return false;
  }
  try {
    const res = await rawFetch(
      `${baseUrl()}${AuthRoutes.refresh.path}`,
      {
        method: "POST",
        headers: jsonHeaders({
          [CLIENT_TYPE_HEADER]: CLIENT_TYPE_MOBILE,
          [REFRESH_TOKEN_HEADER]: refreshToken,
          ...deviceHeaders(),
        }),
      },
    );
    const data = await res.json();
    // Server rotates both tokens; persist the new pair.
    setTokens(data.tokens);
    scheduleProactiveRefresh(data.tokens?.expiresIn as number);
    return true;
  } catch {
    void clear();
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Schedule a silent refresh ~60s before the access token expires.
 * Safe to call repeatedly; clears any prior timer.
 */
export function scheduleProactiveRefresh(expiresInSec?: number): void {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  if (!expiresInSec || expiresInSec <= 0) return;
  // Refresh a minute early, clamped to >=5s.
  const leadMs = Math.min(60_000, Math.max(0, expiresInSec * 1000 - 60_000));
  const delay = Math.max(5_000, expiresInSec * 1000 - leadMs);
  proactiveTimer = setTimeout(() => {
    void refreshOnce().catch(() => {});
  }, delay);
}

export function cancelProactiveRefresh(): void {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
}

/* ------------------------------------------------------------------ */
/* Public request function                                             */
/* ------------------------------------------------------------------ */

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const auth = options.auth ?? true;
  const { tokens } = useAuthStore.getState();

  const headers: Record<string, string> = {
    [CLIENT_TYPE_HEADER]: CLIENT_TYPE_MOBILE,
    ...deviceHeaders(),
  };
  if (auth && tokens?.accessToken) {
    headers.authorization = `Bearer ${tokens.accessToken}`;
  }
  if (options.folderId) {
    const folderToken = useFolderTokenStore.getState().get(options.folderId);
    if (folderToken) headers[FOLDER_TOKEN_HEADER] = folderToken;
  }
  const init: RequestInit = { method: options.method ?? "GET", headers, signal: options.signal };
  if (options.body !== undefined) {
    init.headers = jsonHeaders(headers);
    init.body = JSON.stringify(options.body);
  }

  const url = buildUrl(path, options.query);

  try {
    const res = await rawFetch(url, init);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    const err = e instanceof ApiClientError ? e : new ApiClientError(0, null, "Unexpected error");
    // Transparent refresh + single replay.
    if (err.tokenExpired && auth && !retried) {
      const ok = await refreshOnce();
      if (ok) return request<T>(path, options, true);
      // refresh failed → session already cleared
      throw new ApiClientError(401, { code: "session_revoked", message: "Session expired" });
    }
    // If the server says the session is gone, make sure we clear local state.
    if (err.sessionGone) void useAuthStore.getState().clear();
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};
