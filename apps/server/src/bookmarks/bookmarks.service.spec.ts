import { EXTRACTION_VERSION } from "@ordo/shared";
import { BookmarksService } from "./bookmarks.service.js";
import { UnsupportedContentError } from "./reader.service.js";

describe("BookmarksService extraction refresh", () => {
  function setup(error: Error, hasContent = true) {
    const prisma = {
      bookmark: {
        findUnique: jest.fn().mockResolvedValue({
          contentHtml: hasContent ? "<p>Previously readable article</p>" : null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const reader = { extract: jest.fn().mockRejectedValue(error) };
    const service = new BookmarksService(prisma as never, reader as never, {} as never);

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
});
