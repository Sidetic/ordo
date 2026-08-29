/**
 * Format detection + entry point for import parsing.
 */
import { ErrorCode, IMPORT_FORMATS, type ImportFormat } from "@ordo/shared";
import { AppError } from "../../common/errors/app-error.js";
import { looksLikeOrdoJson, parseOrdoJson } from "./json.parser.js";
import { parseNetscapeHtml } from "./html.parser.js";
import { detectCsvProfile, parseCsv, splitCsv } from "./csv.parser.js";
import type { ParseResult } from "./parse-utils";

const SUPPORTED_FORMATS = IMPORT_FORMATS.join(", ");

/** Detect the source format from the file's own shape. */
export function detectImportFormat(text: string): ImportFormat {
  if (looksLikeOrdoJson(text)) return "ordo-json";
  if (/<!doctype\s+netscape/i.test(text) || /<dl[^>]*>/i.test(text) || /<a\s+href/i.test(text)) {
    return "netscape-html";
  }
  const firstNewline = text.indexOf("\n");
  if (firstNewline !== -1) {
    const firstLine = text.slice(0, firstNewline).trim();
    const rest = text.slice(firstNewline + 1);
    if (firstLine.includes(",") && rest.trim().length > 0) {
      const header = splitCsv(text)[0] ?? [];
      if (detectCsvProfile(header)) return "csv";
    }
  }
  throw new AppError(
    ErrorCode.IMPORT_UNSUPPORTED_FORMAT,
    `Could not recognise this file. Supported formats: ${SUPPORTED_FORMATS}.`,
  );
}

/** Detect the format and parse. Throws IMPORT_UNSUPPORTED_FORMAT / IMPORT_PARSE_FAILED. */
export function detectAndParse(text: string): ParseResult {
  const format = detectImportFormat(text);
  try {
    switch (format) {
      case "ordo-json":
        return parseOrdoJson(text);
      case "netscape-html":
        return parseNetscapeHtml(text);
      case "csv":
        return parseCsv(text);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      ErrorCode.IMPORT_PARSE_FAILED,
      (err as Error)?.message || "The file could not be parsed.",
    );
  }
}
