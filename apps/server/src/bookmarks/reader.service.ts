import { Injectable, Logger } from "@nestjs/common";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import sanitizeHtml from "sanitize-html";

export interface ExtractedContent {
  title: string;
  description: string | null;
  domain: string;
  contentHtml: string;
  contentMarkdown: string;
  contentText: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; OrdoReader/0.1; +https://ordo.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code", "em", "strong", "b", "i", "u", "s", "del", "mark", "sub", "sup",
    "a", "img", "figure", "figcaption", "picture", "source",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span", "section", "article", "header", "footer", "main", "aside", "nav",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height"],
    source: ["srcset", "type"],
    "*": ["id"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  disallowedTagsMode: "discard",
};

/**
 * Fetches a URL and extracts clean, readable article content. Produces three
 * representations: sanitized HTML (for future web reader), Markdown (rendered
 * natively on mobile), and plain text (for full-text search).
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

    const html = await this.fetchHtml(url);
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    const title = this.readMeta(document, "og:title") || document.title?.trim() || domain;
    const description =
      this.readMeta(document, "description") ||
      this.readMeta(document, "og:description") ||
      null;

    let articleHtml: string | null = null;
    try {
      const article = new Readability(document.cloneNode(true) as Document).parse();
      if (article?.content) articleHtml = article.content;
    } catch (err) {
      this.logger.debug(`Readability failed for ${url}: ${(err as Error).message}`);
    }

    // Fall back to the page's main content if Readability produced nothing.
    const rawHtml = articleHtml ?? this.bodyFallback(document);

    const contentHtml = sanitizeHtml(rawHtml, SANITIZE_OPTIONS).trim();
    const contentMarkdown = this.toMarkdown(contentHtml);
    const contentText = this.toPlainText(contentHtml);

    return {
      title: title.slice(0, 500),
      description: description ? description.slice(0, 1000) : null,
      domain,
      contentHtml,
      contentMarkdown,
      contentText: contentText.slice(0, 200_000),
    };
  }

  private async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`Request to ${url} failed with status ${res.status}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type) && !type.includes("xml")) {
      // Non-HTML content — we can't extract an article; let the caller store minimal data.
      throw new Error(`Unsupported content type ${type}`);
    }
    return res.text();
  }

  private bodyFallback(document: Document): string {
    return (
      document.querySelector("article")?.innerHTML ??
      document.querySelector("main")?.innerHTML ??
      document.body?.innerHTML ??
      ""
    );
  }

  private readMeta(document: Document, name: string): string | null {
    const selector =
      name.startsWith("og:")
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`;
    const el = document.querySelector(selector);
    const content = el?.getAttribute("content");
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
