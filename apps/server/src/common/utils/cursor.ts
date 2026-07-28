/** Cursor-based pagination helpers. A cursor encodes `(createdAt, id)` so we can
 *  paginate deterministically even for items that share a timestamp. */
export interface Cursor {
  createdAt: string; // ISO string
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt}|${c.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const sep = decoded.lastIndexOf("|");
    if (sep <= 0) return null;
    const createdAt = decoded.slice(0, sep);
    const id = decoded.slice(sep + 1);
    if (!createdAt || !id) return null;
    const ms = Date.parse(createdAt);
    if (Number.isNaN(ms)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export interface PageMeta {
  limit: number;
  cursor: Cursor | null;
}

/** Clamp a requested page size to allowed bounds. */
export function clampLimit(value: unknown, def: number, max: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? value : def;
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}
