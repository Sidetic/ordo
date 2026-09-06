import { EXTRACTION_VERSION } from "@ordo/shared";
import { ExtractionService } from "./extraction.service.js";
import { ReaderService, UnsupportedContentError } from "./reader.service.js";

describe("ExtractionService", () => {
  function setup(error: Error, contentText: string | null = "Previously readable article") {
    const prisma = {
      bookmark: {
        findUnique: jest.fn().mockResolvedValue({
          contentHtml: contentText ? `<p>${contentText}</p>` : null,
          contentText,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const classifier = new ReaderService();
    const reader = {
      extract: jest.fn().mockRejectedValue(error),
      classifyShellText: (text: string) => classifier.classifyShellText(text),
    };
    const service = new ExtractionService(
      prisma as never,
      reader as never,
      { refreshSafely: () => undefined } as never,
    );

    return { prisma, service };
  }

  it("preserves a readable capture when refresh hits a transient interstitial", async () => {
    const { prisma, service } = setup(new UnsupportedContentError("bot_challenge"));

    await service.enrichBookmark("bookmark-1", "https://example.com/article");

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

    await service.enrichBookmark("bookmark-1", "https://example.com/article");

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

    await service.enrichBookmark("bookmark-1", "https://example.com/article");

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

    await service.enrichBookmark("bookmark-1", "https://example.com/article");

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

  it("reports wave progress from queued pending rows", async () => {
    const prisma = {
      bookmark: {
        count: jest.fn().mockResolvedValue(2),
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new ExtractionService(
      prisma as never,
      { extract: jest.fn().mockRejectedValue(new Error("offline")), classifyShellText: () => null } as never,
      { refreshSafely: () => undefined } as never,
    );
    service.enqueue(
      Array.from({ length: 5 }, (_, i) => ({
        bookmarkId: `b${i}`,
        url: `https://example.com/${i}`,
        userId: "u1",
        mode: "content" as const,
      })),
    );
    await service.whenIdle();
    const snap = await service.progress("u1");
    expect(snap.pending).toBe(2);
    expect(snap.total).toBe(5);
    expect(snap.completed).toBe(3);
  });
});
