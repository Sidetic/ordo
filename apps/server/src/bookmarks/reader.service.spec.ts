import { ReaderService } from "./reader.service.js";

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head>
  <title>Example Article — My Site</title>
  <meta property="og:title" content="The Real Title">
  <meta name="description" content="A short summary of the article.">
</head><body>
  <nav>Home About Contact</nav>
  <article>
    <h1>The Real Title</h1>
    <p>This is <strong>important</strong> text with a <a href="https://example.com">link</a> in it.</p>
    <h2>A Section</h2>
    <p>Second paragraph with more detail here.</p>
    <ul><li>one</li><li>two</li></ul>
    <script>evil()</script>
  </article>
  <footer>Copyright</footer>
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

  it("extracts title from og:title, description from meta, and the domain", async () => {
    mockFetch(SAMPLE_HTML);
    const result = await reader.extract("https://www.example.com/article/123");
    expect(result.title).toBe("The Real Title");
    expect(result.description).toBe("A short summary of the article.");
    expect(result.domain).toBe("example.com");
  });

  it("produces markdown, plain text, and sanitized html", async () => {
    mockFetch(SAMPLE_HTML);
    const result = await reader.extract("https://example.com/x");
    expect(result.contentMarkdown).toMatch(/important/);
    expect(result.contentMarkdown.toLowerCase()).toMatch(/a section/);
    expect(result.contentText).toMatch(/Second paragraph/);
    expect(result.contentHtml).not.toContain("<script");
    expect(result.contentHtml).not.toContain("evil()");
  });

  it("falls back to the document title when og:title is absent", async () => {
    mockFetch(
      `<html><head><title>Fallback Title</title></head><body><article><p>body text</p></article></body></html>`,
    );
    const result = await reader.extract("https://example.com/y");
    expect(result.title).toBe("Fallback Title");
  });

  it("throws on non-2xx responses", async () => {
    mockFetch("", "text/html", false, 404);
    await expect(reader.extract("https://example.com/missing")).rejects.toThrow();
  });

  it("throws on non-html content types", async () => {
    mockFetch("raw bytes", "application/pdf", true, 200);
    await expect(reader.extract("https://example.com/file.pdf")).rejects.toThrow();
  });

  it("still produces a domain even for odd urls", async () => {
    mockFetch(SAMPLE_HTML);
    const result = await reader.extract("https://sub.deep.example.co.uk/path?x=1");
    expect(result.domain).toBe("sub.deep.example.co.uk");
  });
});
