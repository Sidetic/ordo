/** Parse the comma-separated x-folder-tokens header used by global queries. */
import type { Request } from "express";
import { FOLDER_TOKEN_HEADER, FOLDER_TOKENS_HEADER } from "@ordo/shared";

export function getFolderTokens(req: Request): string[] {
  const raw = req.get(FOLDER_TOKENS_HEADER);
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 50);
}

/**
 * Every unlock token the client presented: the single-folder header plus the
 * comma-separated list used by library-wide requests. Callers that gate on a
 * specific folder should accept any of these (tokens are hashed and scoped).
 */
export function getPresentedFolderTokens(req: Request): string[] {
  const single = req.get(FOLDER_TOKEN_HEADER)?.trim();
  const all = [...(single ? [single] : []), ...getFolderTokens(req)];
  return [...new Set(all)].slice(0, 50);
}
