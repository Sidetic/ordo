import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Resolved, typed application configuration.
 * All values default such that the server boots with ZERO environment config.
 */
export interface AppConfig {
  port: number;
  databaseUrl: string;
  /** App secret / token pepper. Auto-generated + persisted if unset. */
  jwtSecret: string;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  corsAllowedOrigins: string[]; // [] => reflect request origin
  smtpUrl: string | null;
  smtpFrom: string;
  /**
   * When false, every rate-limit check is a no-op. Defaults on except in
   * `NODE_ENV=test` (Jest), so local/prod are protected and existing tests
   * keep their unlimited register/login loops. Override with RATE_LIMIT_ENABLED.
   */
  rateLimitEnabled: boolean;
  /**
   * How many reverse-proxy hops to trust when reading `X-Forwarded-For`.
   * 0 (default) uses the socket address only — clients cannot spoof the IP.
   * Set to 1 behind a typical nginx / Caddy / Cloudflare tunnel.
   */
  trustProxy: number;
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .default(resolve(process.cwd(), "prisma", "ordo.db").replace(/^file:/, "")),
  JWT_SECRET: z.string().optional(),
  REGISTRATION_ENABLED: z
    .string()
    .transform((v) => v.toLowerCase())
    .default("true"),
  EMAIL_VERIFICATION_REQUIRED: z
    .string()
    .transform((v) => v.toLowerCase())
    .default("false"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  SMTP_URL: z.string().optional(),
  SMTP_FROM: z.string().default("Ordo <noreply@ordo.local>"),
  RATE_LIMIT_ENABLED: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(32).default(0),
});

function toBool(v: string): boolean {
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** Generate and persist a stable secret so tokens survive restarts. */
function resolveSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const secretPath = join(process.cwd(), ".ordo-secret");
  if (existsSync(secretPath)) {
    return readFileSync(secretPath, "utf8").trim();
  }
  const generated = randomBytes(48).toString("hex");
  try {
    mkdirSync(process.cwd(), { recursive: true });
    writeFileSync(secretPath, generated, { mode: 0o600 });
  } catch {
    // best-effort persistence; if it fails we still boot with an in-memory secret
  }
  return generated;
}

export function loadConfig(): AppConfig {
  const parsed = EnvSchema.parse(process.env);
  const secret = resolveSecret();

  const corsRaw = (parsed.CORS_ALLOWED_ORIGINS ?? "").trim();
  const corsAllowedOrigins = corsRaw
    ? corsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL.startsWith("file:")
      ? parsed.DATABASE_URL
      : `file:${parsed.DATABASE_URL}`,
    jwtSecret: secret,
    registrationEnabled: toBool(parsed.REGISTRATION_ENABLED),
    emailVerificationRequired: toBool(parsed.EMAIL_VERIFICATION_REQUIRED),
    corsAllowedOrigins,
    smtpUrl: parsed.SMTP_URL?.trim() || null,
    smtpFrom: parsed.SMTP_FROM,
    rateLimitEnabled: resolveRateLimitEnabled(parsed.RATE_LIMIT_ENABLED),
    trustProxy: parsed.TRUST_PROXY,
  };
}

function resolveRateLimitEnabled(raw: string | undefined): boolean {
  if (raw !== undefined && raw.trim() !== "") return toBool(raw);
  return process.env.NODE_ENV !== "test";
}
