import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const IV_LEN = 12;
const TAG_LEN = 16;

export function deriveKey(secret: string, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "ordo", info, 32));
}

/** AES-256-GCM. Packed as base64url(iv || tag || ciphertext). */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(packed: string, key: Buffer): string {
  const buf = Buffer.from(packed, "base64url");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
