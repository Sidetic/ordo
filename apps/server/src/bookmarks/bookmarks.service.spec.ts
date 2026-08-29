import { EXTRACTION_VERSION } from "@ordo/shared";
import { BookmarksService } from "./bookmarks.service.js";
import { ReaderService, UnsupportedContentError } from "./reader.service.js";

describe("BookmarksService extraction refresh", () => {
  function setup(error: Error, contentText: string | null = "Previously readable article") {
    const prisma = {
      bookmark: {
        findUnique: jest.fn().mockResolvedValue({
          contentHtml: contentText ? `<p>${contentText}</p>` : null,
          contentText,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const classifier = new ReaderService();
    const reader = {
      extract: jest.fn().mockRejectedValue(error),
      classifyShellText: (text: string) => classifier.classifyShellText(text),
    };
    const service = new BookmarksService(prisma as never, reader as never, {} as never, {} as never);

    return { prisma, service };
  }

  async function enrich(service: BookmarksService) {
    await (
      service as unknown as {
        enrichBookmark(id: string, url: string): Promise<void>;
      }
    ).enrichBookmark("bookmark-1", "https://example.com/article");
  }

  it("preserves a readable capture when refresh hits a transient interstitial", async () => {
    const { prisma, service } = setup(new UnsupportedContentError("bot_challenge"));

    await enrich(service);

    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { id: "bookmark-1" },
      data: {
        fetchStatus: "ok",
        extractionReason: null,
        extractionVersion: EXTRACTION_VERSION,
      },
    });
  });

  it("preserves a readable capture when refresh has a network failure", async () => {
    const { prisma, service } = setup(new Error("connection reset"));

    await enrich(service);

    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { id: "bookmark-1" },
      data: {
        fetchStatus: "ok",
        extractionReason: null,
        extractionVersion: EXTRACTION_VERSION,
      },
    });
  });

  it("replaces stale junk when refresh confirms a definitive unsupported page", async () => {
    const { prisma, service } = setup(new UnsupportedContentError("js_required"));

    await enrich(service);

    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { id: "bookmark-1" },
      data: {
        fetchStatus: "unsupported",
        extractionReason: "js_required",
        extractionVersion: EXTRACTION_VERSION,
        contentHtml: null,
        contentMarkdown: null,
        contentText: null,
        readingTimeMinutes: null,
      },
    });
  });

  it("replaces a stored consent wall instead of preserving it", async () => {
    const consent =
      "This site uses cookies from Google to deliver its services. By using this site, you agree to its use of cookies.";
    const { prisma, service } = setup(new UnsupportedContentError("consent_wall"), consent);

    await enrich(service);

    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { id: "bookmark-1" },
      data: expect.objectContaining({
        fetchStatus: "unsupported",
        extractionReason: "consent_wall",
        contentHtml: null,
        contentText: null,
      }),
    });
  });
});
