import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Generate a URL-safe opaque token of the given entropy (bytes). */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** Deterministic hash for token storage (we never store raw tokens). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a raw token against its stored hash. */
export function verifyToken(token: string, expectedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** HMAC-style peppered hash: mixes the app secret so a DB leak alone can't forge tokens. */
export function pepperedHash(token: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}
