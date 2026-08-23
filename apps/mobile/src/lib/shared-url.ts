/** Return the first HTTP(S) URL from an Android text share. */
export function extractSharedUrl(webUrl?: string | null, text?: string | null): string | null {
  const candidate = webUrl ?? text?.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (!candidate) return null;

  let trimmed = candidate.replace(/[.,;:!?]+$/, "");
  for (const [opening, closing] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    while (
      trimmed.endsWith(closing) &&
      trimmed.split(closing).length > trimmed.split(opening).length
    ) {
      trimmed = trimmed.slice(0, -1);
    }
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
