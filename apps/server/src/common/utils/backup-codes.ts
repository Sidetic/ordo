import { randomBytes } from "node:crypto";
import { MFA } from "@ordo/shared";
import { pepperedHash } from "./tokens.js";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous 0/o/l/1

export function generateBackupCodes(): string[] {
  const codes = new Set<string>();
  while (codes.size < MFA.BACKUP_CODE_COUNT) {
    codes.add(formatBackupCode(randomChars(MFA.BACKUP_CODE_LENGTH)));
  }
  return [...codes];
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function hashBackupCode(code: string, secret: string): string {
  return pepperedHash(normalizeBackupCode(code), secret);
}

export function formatBackupCode(raw: string): string {
  const normalized = normalizeBackupCode(raw);
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}

function randomChars(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
