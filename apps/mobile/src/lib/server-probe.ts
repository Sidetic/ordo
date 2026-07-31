/**
 * Isolated server health-check probe. Runs a live, multi-step check against an
 * arbitrary candidate URL — WITHOUT mutating the global server-URL store. This
 * is what lets the "Change server" UI test a connection safely (the previous
 * implementation temporarily mutated the store, which is what broke Save).
 */
import type { ServerInfoDto } from "@ordo/shared";

export type ProbeStepState = "pending" | "success" | "failure";

export interface ProbeStep {
  command: string;
  state: ProbeStepState;
  latencyMs?: number;
  detail?: string;
}

export type ProbeStatus = "up" | "down";

export interface ProbeResult {
  url: string;
  status: ProbeStatus;
  latencyMs?: number;
  detail?: string;
  info?: ServerInfoDto;
}

const PROBE_TIMEOUT_MS = 8000;

/** Normalise a raw user URL to an origin (`scheme://host[:port]`), or null. */
export function normalizeServerUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Pretty host (without scheme) for display. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Probe a candidate server URL. Calls `onStep` after each step resolves so a
 * terminal-style log can render progressively. Never touches global state.
 */
export async function probeServer(
  rawUrl: string,
  onStep?: (steps: ProbeStep[]) => void,
): Promise<ProbeResult> {
  const origin = normalizeServerUrl(rawUrl);
  if (!origin) return { url: rawUrl, status: "down", detail: "Invalid URL" };

  const host = hostOf(origin);
  const steps: ProbeStep[] = [
    { command: `connect ${host}`, state: "pending" },
    { command: `GET /api/server/info`, state: "pending" },
  ];
  const emit = () => onStep?.(steps.map((s) => ({ ...s })));

  emit();
  const t0 = Date.now();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(`${origin}/api/server/info`, {
      headers: { "x-client-type": "mobile" },
      signal: ac.signal,
    });
    const connectMs = Date.now() - t0;
    steps[0] = { command: `connect ${host}`, state: "success", latencyMs: connectMs };
    emit();

    if (!res.ok) {
      steps[1] = { command: `GET /api/server/info`, state: "failure", detail: `HTTP ${res.status}` };
      emit();
      return { url: origin, status: "down", detail: `HTTP ${res.status}`, latencyMs: connectMs };
    }

    const info = (await res.json()) as ServerInfoDto;
    steps[1] = {
      command: `GET /api/server/info`,
      state: "success",
      latencyMs: Date.now() - t0,
      detail: `${info?.name ?? "Ordo"} v${info?.version ?? "?"}`,
    };
    emit();
    return { url: origin, status: "up", latencyMs: Date.now() - t0, info, detail: "reachable" };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    const detail = aborted ? "timeout" : "unreachable";
    // Mark the first still-pending step as the failure point, and every
    // step after it as skipped — otherwise they sit at "pending" forever
    // and the log looks like the probe hung.
    const failedIdx = steps.findIndex((s) => s.state === "pending");
    for (let i = 0; i < steps.length; i++) {
      if (i < failedIdx) continue;
      steps[i] = {
        command: steps[i].command,
        state: "failure",
        detail: i === failedIdx ? detail : "skipped",
      };
    }
    emit();
    return { url: origin, status: "down", detail };
  } finally {
    clearTimeout(timeout);
  }
}
