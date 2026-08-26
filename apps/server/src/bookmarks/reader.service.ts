import { Injectable, Logger } from "@nestjs/common";
import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import TurndownService from "turndown";
import sanitizeHtml from "sanitize-html";
import type { ExtractionReason } from "@ordo/shared";
import unsupportedDomains from "./reader-unsupported-domains.json";

/** Reasons the reader itself can reject a destination (excludes bookkeeping-only reasons). */
export type ReaderRejectionReason = Exclude<ExtractionReason, "fetch_error" | "interrupted">;

/** Typed rejection: the bookmark is stored as `unsupported` with this reason. */
export class UnsupportedContentError extends Error {
  constructor(
    readonly reason: ReaderRejectionReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "UnsupportedContentError";
  }
}

export interface ExtractedContent {
  title: string;
  description: string | null;
  author: string | null;
  publishedAt: string | null;
  domain: string;
  readingTimeMinutes: number;
  contentHtml: string;
  contentMarkdown: string;
  contentText: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; OrdoReader/0.1; +https://ordo.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

/** Quality gates an extracted (or fallback) body must pass to count as an article. */
const MIN_WORDS = 70;
const MAX_LINK_DENSITY = 0.4;
/** Shell phrases are only trusted on pages with very little text at all. */
const SHELL_TEXT_LIMIT = 2_000;
const WORDS_PER_MINUTE = 200;

/** File extensions that can never be HTML articles. */
const NON_HTML_EXTENSIONS = new Set([
  // documents
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "ods", "odp", "rtf", "epub", "mobi",
  // archives & binaries
  "zip", "gz", "tgz", "bz2", "xz", "tar", "rar", "7z", "dmg", "iso", "exe", "msi", "apk", "deb", "rpm", "bin",
  // audio & video
  "mp3", "wav", "ogg", "flac", "m4a", "aac", "mp4", "avi", "mkv", "mov", "webm", "flv", "wmv", "m4v",
  // images
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tif", "tiff", "heic", "avif",
  // data & code
  "css", "js", "mjs", "json", "xml", "rss", "atom", "csv", "tsv", "txt",
]);

const APP_HOSTS = new Set(unsupportedDomains.appHosts);

/** Pathnames that, combined with a query parameter, are search result pages. */
const SEARCH_PATHS = new Set(["/search", "/results", "/search/", "/results/"]);

const JS_REQUIRED_PATTERNS: RegExp[] = [
  /(?:please|kindly) (?:enable|turn on|activate) (?:javascript|js)\b/,
  /enable (?:javascript|js) to (?:continue|view|read|use|see|access)/,
  /javascript (?:is|must be|needs to be|has to be|appears to be|seems to be) (?:not )?(?:enabled|disabled|required|turned on|turned off|activated|supported)/,
  /\bjs (?:is|must be|needs to be) (?:not )?(?:enabled|disabled|required)/,
  /(?:javascript|js) (?:is )?required/,
  /browser (?:does not|doesn'?t|doesnt) support (?:javascript|js)/,
  /without (?:javascript|js)/,
];

const LOGIN_PAYWALL_PATTERNS: RegExp[] = [
  /sign ?in (?:to|in order to) (?:continue|read|view|access|see)/,
  /log ?in (?:to|in order to) (?:continue|read|view|access|see)/,
  /(?:create|register) (?:a )?(?:free )?account to (?:continue|read|view|access)/,
  /subscribe to (?:continue|read|view|keep reading)/,
  /subscription (?:is )?required/,
  /paid (?:subscription|account|plan) required/,
  /already a subscriber/,
  /members[- ]only (?:content|article)/,
];

const BOT_CHALLENGE_PATTERNS: RegExp[] = [
  /verify (?:that )?you'?re? (?:a )?human/,
  /are you a robot/,
  /checking your browser/,
  /just a moment\.\.\./,
  /unusual traffic/,
  /(?:ddos|bot) protection/,
  /complete the (?:security check|captcha)/,
  /(?:verify|solve) (?:the )?captcha/,
  /access (?:denied|blocked)/,
];

const CONSENT_WALL_PATTERNS: RegExp[] = [
  /before you continue (?:to|with)/,
  /accept (?:all )?cookies to (?:continue|proceed|read|view)/,
  /cookies? must be (?:enabled|accepted)/,
  /consent (?:is )?required/,
  /this site uses cookies[\s\S]*by using this site,? you agree/,
];

/** Semantic tags only; layout wrappers are unwrapped, interactive embeds dropped. */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "em", "strong", "b", "i", "u", "s", "del", "mark", "sub", "sup", "abbr", "kbd", "cite", "q", "small",
    "a", "img", "figure", "figcaption", "picture", "source",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "time",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    source: ["srcset", "type", "media"],
    time: ["datetime"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"], source: ["http", "https"] },
  // drop images whose src was stripped (e.g. data: URLs) — an img without src is junk
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  disallowedTagsMode: "discard",
};

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Lowercase, strip punctuation/symbols, collapse whitespace — for comparisons. */
function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Share of an element's text that lives inside links (0..1). */
function linkDensity(element: Element): number {
  const total = (element.textContent ?? "").length;
  if (total === 0) return 1;
  let linkText = 0;
  for (const a of Array.from(element.querySelectorAll("a"))) {
    linkText += (a.textContent ?? "").length;
  }
  return linkText / total;
}

/** True when two strings are the same text up to punctuation/spacing, or one
 *  contains the other (page titles are often suffixed with the site name). */
function duplicatesText(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  if (shorter.length < 8) return false;
  return na.includes(shorter) || nb.includes(shorter);
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Fetches a URL and extracts clean, readable article content using
 * Readability. Produces sanitized semantic HTML (primary), Markdown (kept for
 * compatibility/search), and plain text (full-text search), plus article
 * metadata (title, excerpt, byline, published time, reading time).
 *
 * Unsupported destinations and non-articles are rejected with a typed
 * `UnsupportedContentError` so callers can store a classifiable reason
 * instead of junk content. Scripts are never executed (JSDOM is created
 * without `runScripts`).
 */
@Injectable()
export class ReaderService {
  private readonly logger = new Logger(ReaderService.name);
  private readonly turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  async extract(url: string): Promise<ExtractedContent> {
    const domain = this.safeHostname(url);
    this.rejectUnsupportedDestination(url);

    const html = await this.fetchHtml(url);
    // No `runScripts`: embedded scripts are parsed but never executed.
    const document = new JSDOM(html, { url }).window.document;

    const visibleText = this.shellDetectionText(document);
    if (!visibleText) {
      throw new UnsupportedContentError("too_short", "Page contains no readable text");
    }
    const shell = this.classifyShellText(visibleText);
    if (shell) {
      throw new UnsupportedContentError(shell, `Page looks like a ${shell.replace(/_/g, " ")} shell`);
    }

    this.stripNonContentTags(document);

    let parsed: ReturnType<Readability["parse"]> = null;
    if (isProbablyReaderable(document)) {
      try {
        parsed = new Readability(document.cloneNode(true) as Document).parse();
      } catch (err) {
        this.logger.debug(`Readability failed for ${url}: ${(err as Error).message}`);
      }
    }

    let contentRoot: Element;
    if (parsed?.content) {
      contentRoot = this.parseFragment(parsed.content);
    } else {
      const fallback = this.narrowFallback(document);
      if (!fallback) {
        throw new UnsupportedContentError("not_an_article", "No readable article content found");
      }
      contentRoot = fallback;
    }
    this.unwrapLayoutRoots(contentRoot);

    // Quality gates — reject link farms, app/home shells and stubs.
    const text = normalizeSpace(contentRoot.textContent ?? "");
    const extractedShell = this.classifyShellText(text);
    if (extractedShell) {
      throw new UnsupportedContentError(
        extractedShell,
        `Extracted content is a ${extractedShell.replace(/_/g, " ")} shell`,
      );
    }
    if (wordCount(text) < MIN_WORDS) {
      throw new UnsupportedContentError("too_short", "Extracted content is too short to read");
    }
    if (linkDensity(contentRoot) > MAX_LINK_DENSITY) {
      throw new UnsupportedContentError("not_an_article", "Content is mostly links, not an article");
    }

    const title = this.resolveTitle(parsed?.title, document, domain);
    const description =
      this.readMeta(document, "description") ||
      this.readMeta(document, "og:description") ||
      (parsed?.excerpt ? normalizeSpace(parsed.excerpt) : null);

    this.convertEmbedsToLinks(contentRoot, url);
    this.removeDuplicateLeadingHeading(contentRoot, title);
    this.removeDuplicateLeadingParagraph(contentRoot, description);

    const contentHtml = sanitizeHtml(contentRoot.innerHTML, SANITIZE_OPTIONS).trim();
    if (!contentHtml) {
      throw new UnsupportedContentError("too_short", "Extracted content is empty after sanitizing");
    }
    const contentText = this.toPlainText(contentHtml);
    const readingTimeMinutes = Math.max(
      1,
      Math.round(wordCount(contentText) / WORDS_PER_MINUTE),
    );

    return {
      title: title.slice(0, 500),
      description: description ? description.slice(0, 1000) : null,
      author: (parsed?.byline?.trim() || this.readMeta(document, "author"))?.slice(0, 200) ?? null,
      publishedAt: toIsoDate(parsed?.publishedTime ?? this.readMeta(document, "article:published_time")),
      domain,
      readingTimeMinutes,
      contentHtml,
      contentMarkdown: this.toMarkdown(contentHtml),
      contentText: contentText.slice(0, 200_000),
    };
  }

  /** Classify destinations an article reader can never handle before fetching. */
  private rejectUnsupportedDestination(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    const path = parsed.pathname.toLowerCase();
    const filename = path.slice(path.lastIndexOf("/") + 1);
    const dot = filename.lastIndexOf(".");
    if (dot !== -1 && NON_HTML_EXTENSIONS.has(filename.slice(dot + 1))) {
      throw new UnsupportedContentError("non_html_content", `.${filename.slice(dot + 1)} files are not articles`);
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const knownShell =
      APP_HOSTS.has(host) ||
      unsupportedDomains.socialVideoAppHosts.some(
        (configuredHost) => host === configuredHost || host.endsWith(`.${configuredHost}`),
      ) ||
      unsupportedDomains.appHostPrefixes.some((prefix) => host.startsWith(prefix));
    if (knownShell) {
      throw new UnsupportedContentError("social_video_or_app", `${host} is not an article source`);
    }

    if (
      SEARCH_PATHS.has(path) &&
      (parsed.searchParams.get("q") ?? parsed.searchParams.get("query") ?? parsed.searchParams.get("search"))
    ) {
      throw new UnsupportedContentError("not_an_article", "Search result pages are not articles");
    }
  }

  /** Detect obvious JS-only/error/interstitial shells by their telltale text. */
  classifyShellText(text: string): ReaderRejectionReason | null {
    if (text.length > SHELL_TEXT_LIMIT) return null; // real articles have real text
    const t = text.toLowerCase();
    for (const pattern of BOT_CHALLENGE_PATTERNS) {
      if (pattern.test(t)) return "bot_challenge";
    }
    for (const pattern of JS_REQUIRED_PATTERNS) {
      if (pattern.test(t)) return "js_required";
    }
    for (const pattern of LOGIN_PAYWALL_PATTERNS) {
      if (pattern.test(t)) return "login_or_paywall";
    }
    for (const pattern of CONSENT_WALL_PATTERNS) {
      if (pattern.test(t)) return "consent_wall";
    }
    return null;
  }

  private stripNonContentTags(document: Document): void {
    document
      .querySelectorAll("script, style, noscript, template, form, button, input, select, textarea, canvas, svg, dialog")
      .forEach((el) => el.remove());
  }

  /** Script/style bundles are not visible page copy and must not hide a short
   *  noscript warning by pushing it over the shell-detection size limit. */
  private shellDetectionText(document: Document): string {
    const clone = document.cloneNode(true) as Document;
    clone
      .querySelectorAll("script, style, template, svg, canvas")
      .forEach((el) => el.remove());
    return normalizeSpace(clone.body?.textContent ?? "");
  }

  /** Narrow `<article>`/`<main>` fallback, accepted only if it passes the
   *  same quality gates as the primary extraction. */
  private narrowFallback(document: Document): Element | null {
    for (const selector of ["article", "main", '[role="main"]']) {
      const viable = Array.from(document.querySelectorAll(selector))
        .filter((el) => wordCount(el.textContent ?? "") >= MIN_WORDS)
        .filter((el) => linkDensity(el) <= MAX_LINK_DENSITY)
        .sort((a, b) => (b.textContent ?? "").length - (a.textContent ?? "").length);
      if (viable.length > 0) return this.parseFragment(viable[0].outerHTML);
    }
    return null;
  }

  private resolveTitle(readabilityTitle: string | undefined, document: Document, domain: string): string {
    return (
      readabilityTitle?.trim() ||
      this.readMeta(document, "og:title") ||
      document.title?.trim() ||
      domain
    );
  }

  private parseFragment(html: string): Element {
    return new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body;
  }

  /**
   * Readability (and many pages) wrap the real content in layout roots like
   * `<div id="readability-page-1"><article>…`. Hoist the children so the
   * leading-block checks below see the actual first heading/paragraph.
   */
  private unwrapLayoutRoots(root: Element): void {
    for (let guard = 0; guard < 10; guard += 1) {
      const meaningful = Array.from(root.childNodes).filter(
        (node) =>
          !(node.nodeType === 3 && !(node.textContent ?? "").trim()) && node.nodeType !== 8,
      );
      const only = meaningful.length === 1 && meaningful[0].nodeType === 1
        ? (meaningful[0] as Element)
        : null;
      if (!only) return;
      const tag = only.tagName.toLowerCase();
      if (tag !== "div" && tag !== "article" && tag !== "section") return;
      const parent = only.parentNode;
      if (!parent) return;
      while (only.firstChild) parent.insertBefore(only.firstChild, only);
      parent.removeChild(only);
    }
  }

  /** Replace iframes/embeds with a plain link paragraph; drop unsupported ones. */
  private convertEmbedsToLinks(root: Element, baseUrl: string): void {
    for (const el of Array.from(root.querySelectorAll("iframe, embed, object"))) {
      const src =
        el.getAttribute("src") ??
        el.querySelector('param[name="movie"]')?.getAttribute("value") ??
        "";
      let href: string | null = null;
      if (src) {
        try {
          const resolved = new URL(src, baseUrl);
          if (resolved.protocol === "http:" || resolved.protocol === "https:") {
            href = resolved.toString();
          }
        } catch {
          href = null;
        }
      }
      if (!href) {
        el.remove();
        continue;
      }
      const doc = el.ownerDocument;
      if (!doc) {
        el.remove();
        continue;
      }
      const p = doc.createElement("p");
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.textContent = href;
      p.appendChild(a);
      el.replaceWith(p);
    }
  }

  /** Drop a leading H1/H2 that just repeats the extracted title. */
  private removeDuplicateLeadingHeading(root: Element, title: string): void {
    const first = this.firstElementChild(root);
    if (!first) return;
    const tag = first.tagName.toLowerCase();
    if (tag !== "h1" && tag !== "h2") return;
    if (duplicatesText(title, first.textContent ?? "")) first.remove();
  }

  /** Drop a leading paragraph that just repeats the description/excerpt. */
  private removeDuplicateLeadingParagraph(root: Element, description: string | null): void {
    if (!description) return;
    const first = this.firstElementChild(root);
    if (!first || first.tagName.toLowerCase() !== "p") return;
    if (duplicatesText(description, first.textContent ?? "")) first.remove();
  }

  private firstElementChild(root: Element): Element | null {
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === 3) {
        // skip whitespace between block elements; real text means no leading block
        if (!(node.textContent ?? "").trim()) continue;
        return null;
      }
      if (node.nodeType === 8) continue; // comments
      return node.nodeType === 1 ? (node as Element) : null;
    }
    return null;
  }

  private async fetchHtml(url: string): Promise<string> {
    let current = new URL(url);
    let res: Response | null = null;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await this.assertPublicDestination(current);
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });
      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get("location");
      if (!location) break;
      if (redirects === MAX_REDIRECTS) throw new Error("Too many redirects");
      current = new URL(location, current);
      this.rejectUnsupportedDestination(current.toString());
    }
    if (!res) throw new Error(`Request to ${url} returned no response`);
    if (!res.ok) {
      throw new Error(`Request to ${url} failed with status ${res.status}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
      throw new UnsupportedContentError("non_html_content", `Unsupported content type ${type}`);
    }
    const declaredLength = Number(res.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new UnsupportedContentError("non_html_content", "HTML response is too large");
    }
    if (!res.body) return res.text(); // small test/mocked responses

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new UnsupportedContentError("non_html_content", "HTML response is too large");
      }
      html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
  }

  /** Reject loopback, private, link-local, multicast and documentation ranges
   *  before every request and redirect to prevent server-side request forgery. */
  private async assertPublicDestination(url: URL): Promise<void> {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new UnsupportedContentError("non_html_content", "Only HTTP pages are supported");
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost")) {
      throw new UnsupportedContentError("non_html_content", "Private network URLs are not supported");
    }
    const addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => !this.isPublicIp(address))) {
      throw new UnsupportedContentError("non_html_content", "Private network URLs are not supported");
    }
  }

  private isPublicIp(address: string): boolean {
    if (address.includes(":")) {
      const normalized = address.toLowerCase();
      const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
      if (mapped) return this.isPublicIp(mapped);
      return !(
        normalized === "::" ||
        normalized === "::1" ||
        /^f[cd]/.test(normalized) ||
        /^fe[89ab]/.test(normalized) ||
        normalized.startsWith("2001:db8:")
      );
    }
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }
    const [a, b, c] = octets;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113)
    );
  }

  private readMeta(document: Document, name: string): string | null {
    // namespaced keys (og:, article:, twitter:) live in `property`, others in `name`
    const selector = name.includes(":") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const elements = Array.from(document.querySelectorAll(selector));
    const content =
      elements.find((el) => el.getAttribute("content")?.trim())?.getAttribute("content") ?? null;
    return content?.trim() || null;
  }

  private toMarkdown(html: string): string {
    try {
      return this.turndown.turndown(html).trim();
    } catch {
      return this.toPlainText(html);
    }
  }

  private toPlainText(html: string): string {
    try {
      const dom = new JSDOM(html);
      return (dom.window.document.body?.textContent ?? "").replace(/\s+\n/g, "\n").trim();
    } catch {
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  private safeHostname(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url.slice(0, 255);
    }
  }
}
