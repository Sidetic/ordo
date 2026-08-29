/** Parse the comma-separated x-folder-tokens header used by global queries. */
import type { Request } from "express";
import { FOLDER_TOKENS_HEADER } from "@ordo/shared";

export function getFolderTokens(req: Request): string[] {
  const raw = req.get(FOLDER_TOKENS_HEADER);
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 50);
}
