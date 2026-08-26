import { ReaderService, UnsupportedContentError } from "./reader.service.js";

const P = (i: number) =>
  `<p>Paragraph ${i} with plenty of words to satisfy the quality gates that the reader applies before accepting content. It talks about distributed systems, caching layers, and the tradeoffs engineers make every day.</p>`;

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head>
  <title>Example Article — My Site</title>
  <meta property="og:title" content="The Real Title">
  <meta name="description" content="A short summary of the article.">
  <meta name="author" content="Jane Doe">
  <meta property="article:published_time" content="2024-05-01T10:00:00Z">
</head><body>
  <nav>Home About Contact</nav>
  <article>
    <h1>The Real Title</h1>
    <p>A short summary of the article.</p>
    ${P(1)}${P(2)}${P(3)}${P(4)}
    <h2>A Section</h2>
    ${P(5)}${P(6)}
    <figure><img src="https://example.com/cat.png" alt="A cat"><figcaption>A cat caption</figcaption></figure>
    ${P(7)}
    <iframe src="https://www.youtube.com/embed/abc123"></iframe>
    ${P(8)}
    <img src="data:image/png;base64,secret">
    <script>evil()</script>
  </article>
  <footer>Copyright</footer>
</body></html>`;

/** A real article whose text is kept under Readability's readerable threshold
 *  (no paragraph reaches 140 chars and the article scores below 20), forcing
 *  the narrow `<article>` fallback path. */
const SHORT_ARTICLE_HTML = `<!DOCTYPE html>
<html><head><title>Fallback Piece — Site</title>
  <meta property="og:title" content="Fallback Piece">
</head><body>
  <article>
    <h1>Fallback Piece</h1>
    <p>Intro line about reading very carefully here now today</p>
    <p>Second short line about the clearly stated topic at hand</p>
    <p>Third short line adding a little more real bulk now</p>
    <p>Fourth short line included for the word gate</p>
    <p>Fifth short line continuing the tiny written piece</p>
    <p>Sixth short line with additional plain words here</p>
    <p>Seventh short line still discussing the same thing</p>
    <p>Eighth short line that finally wraps the piece</p>
  </article>
</body></html>`;

describe("ReaderService", () => {
  let reader: ReaderService;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    reader = new ReaderService();
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(html: string, contentType = "text/html", ok = true, status = 200): void {
    globalThis.fetch = (async () =>
      ({
        ok,
        status,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null),
        },
        text: async () => html,
      }) as unknown as Response) as typeof globalThis.fetch;
  }

  function mockFetchNeverCalled(): void {
    globalThis.fetch = (() => {
      throw new Error("fetch must not be called for pre-bypassed destinations");
    }) as typeof globalThis.fetch;
  }

  async function expectUnsupported(url: string, reason: string): Promise<UnsupportedContentError> {
    try {
      await reader.extract(url);
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedContentError);
      const unsupported = err as UnsupportedContentError;
      expect(unsupported.reason).toBe(reason);
      return unsupported;
    }
    throw new Error(`Expected ${url} to be rejected as ${reason}`);
  }

  describe("successful extraction", () => {
    it("extracts the article body as sanitized semantic html, text, and markdown", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://www.example.com/article/123");

      expect(result.contentHtml).toContain("<p>Paragraph 1");
      expect(result.contentHtml).toContain("<figure>");
      expect(result.contentHtml).toContain("A cat caption");
      expect(result.contentHtml).toContain('alt="A cat"');
      expect(result.contentText).toMatch(/Paragraph 5/);
      expect(result.contentMarkdown.toLowerCase()).toMatch(/## a section/);
      // scripts, iframes and data: urls never survive
      expect(result.contentHtml).not.toContain("<script");
      expect(result.contentHtml).not.toContain("evil()");
      expect(result.contentHtml).not.toContain("<iframe");
      expect(result.contentHtml).not.toContain("data:");
    });

    it("prefers the Readability title and captures description, byline, publishedTime and domain", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://www.example.com/article/123");

      expect(result.title).toBe("The Real Title");
      expect(result.description).toBe("A short summary of the article.");
      expect(result.author).toBe("Jane Doe");
      expect(result.publishedAt).toBe("2024-05-01T10:00:00.000Z");
      expect(result.domain).toBe("example.com");
    });

    it("computes a positive reading time from the extracted text", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://example.com/x");
      expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    });

    it("converts embeds into safe link paragraphs", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://example.com/x");
      expect(result.contentHtml).toContain(
        '<a href="https://www.youtube.com/embed/abc123">https://www.youtube.com/embed/abc123</a>',
      );
    });

    it("falls back to the document title when og:title is absent", async () => {
      mockFetch(SAMPLE_HTML.replace('<meta property="og:title" content="The Real Title">', ""));
      const result = await reader.extract("https://example.com/y");
      expect(result.title).toBe("Example Article — My Site");
    });

    it("normalizes the www prefix while preserving the source domain", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://www.example.com/path?x=1");
      expect(result.domain).toBe("example.com");
    });
  });

  describe("duplicate leading blocks", () => {
    it("removes a leading paragraph that repeats the description", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://example.com/x");
      expect(result.description).toBe("A short summary of the article.");
      expect(result.contentHtml.startsWith("<p>Paragraph 1")).toBe(true);
    });

    it("removes a leading heading that repeats the extracted title (narrow fallback path)", async () => {
      mockFetch(SHORT_ARTICLE_HTML);
      const result = await reader.extract("https://example.com/short");

      expect(result.title).toBe("Fallback Piece");
      // the duplicated h1 is gone, the article body itself remains
      expect(result.contentHtml).not.toContain("<h1");
      expect(result.contentHtml).not.toContain("Fallback Piece");
      expect(result.contentHtml).toContain("Intro line about reading very carefully");
      expect(result.contentText).toContain("Fifth short line");
    });
  });

  describe("typed rejections", () => {
    it("rejects a JavaScript-required shell with reason js_required", async () => {
      mockFetch(`<!DOCTYPE html><html><body>
        <noscript><p>Please enable JavaScript to continue using this site.</p></noscript>
        <div id="root"></div>
      </body></html>`);
      await expectUnsupported("https://example.com/app", "js_required");
    });

    it("recognizes variants of the JavaScript-required wording", async () => {
      mockFetch(`<html><body><p>JavaScript is not enabled in your browser. Turn on JavaScript.</p></body></html>`);
      await expectUnsupported("https://example.com/js-off", "js_required");
    });

    it("rejects the Google Sites cookie disclosure shown instead of an article", async () => {
      mockFetch(`<html><body><main>
        <h1>Home</h1>
        <p>This site uses cookies from Google to deliver its services and to analyze traffic.
        Information about your use of this site is shared with Google. By using this site,
        you agree to its use of cookies.</p><a href="/learn-more">Learn more</a><p>Got it</p>
      </main></body></html>`);
      await expectUnsupported("https://liech.space/", "consent_wall");
    });

    it("detects noscript warnings even when a large inline bundle is present", async () => {
      mockFetch(`<html><body>
        <script>${"const bundledCode = true;".repeat(200)}</script>
        <noscript>Please enable JavaScript to continue using this site.</noscript>
        <div id="root"></div>
      </body></html>`);
      await expectUnsupported("https://example.com/app-shell", "js_required");
    });

    it("rejects bot challenges and login/paywall shells", async () => {
      mockFetch(`<html><body><p>Checking your browser before accessing the site.</p></body></html>`);
      await expectUnsupported("https://example.com/bot", "bot_challenge");

      mockFetch(`<html><body><p>Sign in to continue reading this article.</p></body></html>`);
      await expectUnsupported("https://example.com/login", "login_or_paywall");
    });

    it("rejects a link-heavy listing page with reason not_an_article", async () => {
      const entries = Array.from(
        { length: 10 },
        (_, i) => `<p><a href="/item/${i}">Item ${i} — a listed link entry with a blurb</a></p>`,
      ).join("");
      mockFetch(`<!DOCTYPE html><html><head><title>All posts</title></head><body>
        <main><h1>All posts</h1>${entries}</main>
      </body></html>`);
      await expectUnsupported("https://example.com/all-posts", "not_an_article");
    });

    it("rejects Google-Sites-style home/app shells through quality checks, not hostnames", async () => {
      mockFetch(`<!DOCTYPE html><html><head><title>Liech</title></head><body>
        <header><h1>Liech</h1></header>
        <nav><a href="/">Home</a> <a href="/apps">Apps</a> <a href="/blog">Blog</a> <a href="/contact">Contact</a></nav>
        <main>
          <section><h2>Welcome</h2><p>Thanks for visiting. Use the links above.</p></section>
          <section><h2>Links</h2><p><a href="/a">Project A</a></p><p><a href="/b">Project B</a></p></section>
        </main>
        <footer><p>© 2026</p></footer>
      </body></html>`);
      await expectUnsupported("https://liech.space/", "not_an_article");
    });

    it("rejects empty pages with reason too_short", async () => {
      mockFetch("<html><head><title>Empty</title></head><body><div></div></body></html>");
      await expectUnsupported("https://example.com/empty", "too_short");
    });

    it("throws a typed unsupported error for non-HTML content types", async () => {
      mockFetch("raw bytes", "application/pdf", true, 200);
      await expectUnsupported("https://example.com/file", "non_html_content");
    });

    it("pre-bypasses non-HTML file extensions without fetching", async () => {
      mockFetchNeverCalled();
      await expectUnsupported("https://example.com/files/report.pdf", "non_html_content");
      await expectUnsupported("https://example.com/photo.JPG", "non_html_content");
      await expectUnsupported("https://example.com/archive.tar.gz", "non_html_content");
    });

    it("pre-bypasses social/video/app destinations without fetching", async () => {
      mockFetchNeverCalled();
      await expectUnsupported("https://www.youtube.com/watch?v=abc", "social_video_or_app");
      await expectUnsupported("https://x.com/user/status/123", "social_video_or_app");
      await expectUnsupported("https://open.spotify.com/track/xyz", "social_video_or_app");
      await expectUnsupported("https://app.example.com/dashboard", "social_video_or_app");
      await expectUnsupported("https://docs.google.com/document/d/xyz/edit", "social_video_or_app");
    });

    it("pre-bypasses recognizable search result pages", async () => {
      mockFetchNeverCalled();
      await expectUnsupported("https://example.com/search?q=shoes", "not_an_article");
    });

    it("blocks loopback and private-network destinations without fetching", async () => {
      mockFetchNeverCalled();
      await expectUnsupported("http://localhost/admin", "non_html_content");
      await expectUnsupported("http://127.0.0.1/admin", "non_html_content");
      await expectUnsupported("http://169.254.169.254/latest/meta-data", "non_html_content");
      await expectUnsupported("http://192.168.1.1/", "non_html_content");
      await expectUnsupported("http://[::1]/", "non_html_content");
    });
  });

  describe("fetch failures", () => {
    it("throws plain (non-unsupported) errors on non-2xx responses", async () => {
      mockFetch("", "text/html", false, 404);
      await expect(reader.extract("https://example.com/missing")).rejects.toThrow(/status 404/);
    });

    it("does not pre-bypass normal article URLs", async () => {
      mockFetch(SAMPLE_HTML);
      const result = await reader.extract("https://example.com/posts/2026/how-we-built-it");
      expect(result.title).toBe("The Real Title");
    });
  });
});
