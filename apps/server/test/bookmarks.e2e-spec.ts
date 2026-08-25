import request from "supertest";
import { DEFAULT_FOLDER_ICON, ErrorCode } from "@ordo/shared";
import { ReaderService } from "../src/bookmarks/reader.service.js";
import {
  clearDb,
  createTestApp,
  registerUser,
  teardownApp,
  type TestCtx,
} from "./utils.js";

const FAKE_EXTRACTED = {
  title: "Sample Article",
  description: "A summary.",
  domain: "example.com",
  contentHtml: "<p>Hello world.</p>",
  contentMarkdown: "Hello world.",
  contentText: "Hello world.",
};

function fakeReader() {
  return { extract: async () => ({ ...FAKE_EXTRACTED }) } as unknown as ReaderService;
}

describe("Bookmarks & Folders (e2e)", () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    ctx = await createTestApp({
      customize: (b) => b.overrideProvider(ReaderService).useValue(fakeReader()),
    });
  });

  afterAll(async () => {
    await teardownApp(ctx);
  });

  beforeEach(async () => {
    await clearDb(ctx.prisma);
  });

  /** Register a fresh user; new accounts start with zero folders. */
  async function setup() {
    const auth = await registerUser(ctx.app, "reader@ordo.app");
    const agent = request.agent(ctx.app.getHttpServer()).auth(auth.tokens.accessToken, {
      type: "bearer",
    });
    expect(await ctx.prisma.folder.count({ where: { userId: auth.user.id } })).toBe(0);
    return { agent, userId: auth.user.id };
  }

  describe("folders", () => {
    it("creates a folder and lists folders for a fresh account", async () => {
      const { agent } = await setup();

      const created = await agent
        .post("/api/folders")
        .send({ name: "Reading" })
        .expect(201);
      expect(created.body.name).toBe("Reading");
      expect(created.body.icon).toBe("folder-outline");
      expect(created.body.pinned).toBe(false);
      expect(created.body.protected).toBe(false);
      expect(created.body.bookmarkCount).toBe(0);
      expect(created.body.unreadCount).toBe(0);

      const list = await agent.get("/api/folders").expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].id).toBe(created.body.id);
    });

    it("creates a folder with an explicit icon and defaults otherwise", async () => {
      const { agent } = await setup();

      const withIcon = await agent
        .post("/api/folders")
        .send({ name: "Dev", icon: "code-slash-outline" })
        .expect(201);
      expect(withIcon.body.icon).toBe("code-slash-outline");
      expect(withIcon.body.pinned).toBe(false);

      const plain = await agent.post("/api/folders").send({ name: "Misc" }).expect(201);
      expect(plain.body.icon).toBe("folder-outline");
      expect(plain.body.pinned).toBe(false);

      const invalid = await agent
        .post("/api/folders")
        .send({ name: "Bad", icon: "not-an-ionicon" })
        .expect(400);
      expect(invalid.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("falls back safely when persisted icon data is unsupported", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Reading" }).expect(201);
      await ctx.prisma.folder.update({
        where: { id: folder.body.id },
        data: { icon: "removed-icon-outline" },
      });

      const folders = await agent.get("/api/folders").expect(200);
      expect(folders.body[0].icon).toBe(DEFAULT_FOLDER_ICON);
    });

    it("updates folder metadata (name/icon/pinned) and keeps counts accurate", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Reading" }).expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/1", folderId: folder.body.id })
        .expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/2", folderId: folder.body.id })
        .expect(201);
      const read = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/3", folderId: folder.body.id })
        .expect(201);
      await agent.patch(`/api/bookmarks/${read.body.id}`).send({ isRead: true }).expect(200);

      const updated = await agent
        .patch(`/api/folders/${folder.body.id}`)
        .send({ name: "Read Later", icon: "reader-outline", pinned: true })
        .expect(200);
      expect(updated.body.name).toBe("Read Later");
      expect(updated.body.icon).toBe("reader-outline");
      expect(updated.body.pinned).toBe(true);
      // counts must reflect the folder's real contents after the update
      expect(updated.body.bookmarkCount).toBe(3);
      expect(updated.body.unreadCount).toBe(2);

      const empty = await agent.patch(`/api/folders/${folder.body.id}`).send({}).expect(400);
      expect(empty.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);

      // partial update touching only pinned leaves other metadata intact
      const pinnedOnly = await agent
        .patch(`/api/folders/${folder.body.id}`)
        .send({ pinned: false })
        .expect(200);
      expect(pinnedOnly.body.name).toBe("Read Later");
      expect(pinnedOnly.body.icon).toBe("reader-outline");
      expect(pinnedOnly.body.pinned).toBe(false);
    });

    it("lists pinned folders first, then position/creation order", async () => {
      const { agent } = await setup();
      const alpha = await agent.post("/api/folders").send({ name: "Alpha" }).expect(201);
      const beta = await agent.post("/api/folders").send({ name: "Beta" }).expect(201);
      const gamma = await agent.post("/api/folders").send({ name: "Gamma" }).expect(201);

      const names = async () => {
        const res = await agent.get("/api/folders").expect(200);
        return res.body.map((f: { name: string }) => f.name);
      };

      expect(await names()).toEqual(["Alpha", "Beta", "Gamma"]);

      await agent.patch(`/api/folders/${gamma.body.id}`).send({ pinned: true }).expect(200);
      expect(await names()).toEqual(["Gamma", "Alpha", "Beta"]);

      await agent.patch(`/api/folders/${alpha.body.id}`).send({ pinned: true }).expect(200);
      expect(await names()).toEqual(["Alpha", "Gamma", "Beta"]);

      await agent.patch(`/api/folders/${gamma.body.id}`).send({ pinned: false }).expect(200);
      expect(await names()).toEqual(["Alpha", "Beta", "Gamma"]);
    });

    it("deletes any folder, including non-empty ones, cascading its bookmarks", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Temp" }).expect(201);
      const b1 = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/a", folderId: folder.body.id })
        .expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/b", folderId: folder.body.id })
        .expect(201);

      await agent.delete(`/api/folders/${folder.body.id}`).expect(200);
      const after = await agent.get("/api/folders").expect(200);
      expect(after.body).toHaveLength(0);

      const gone = await agent.get(`/api/bookmarks/${b1.body.id}`).expect(404);
      expect(gone.body.error.code).toBe(ErrorCode.BOOKMARK_NOT_FOUND);
    });

    it("does not expose other users' folders", async () => {
      const { agent } = await setup();
      const other = await registerUser(ctx.app, "other@ordo.app");
      const foreign = await ctx.prisma.folder.create({
        data: { userId: other.user.id, name: "Foreign" },
      });

      await agent.get("/api/folders").expect(200, []);
      await agent.get(`/api/bookmarks?folderId=${foreign.id}`).expect(404);
      await agent.delete(`/api/folders/${foreign.id}`).expect(404);
    });

    it("reports folder counts (total + unread)", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Counted" }).expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/1", folderId: folder.body.id })
        .expect(201);
      const b2 = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/2", folderId: folder.body.id })
        .expect(201);

      await agent.patch(`/api/bookmarks/${b2.body.id}`).send({ isRead: true }).expect(200);

      const folders = (await agent.get("/api/folders").expect(200)).body;
      const found = folders.find((f: { id: string }) => f.id === folder.body.id);
      expect(found.bookmarkCount).toBe(2);
      expect(found.unreadCount).toBe(1);
    });
  });

  describe("unfiled bookmarks", () => {
    it("creates an unfiled bookmark without a folderId", async () => {
      const { agent } = await setup();
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/article" })
        .expect(201);
      expect(res.body.folderId).toBeNull();
      expect(res.body.title).toBe("example.com");
      expect(res.body.domain).toBe("example.com");
      expect(res.body.contentMarkdown).toBeNull();
      expect(res.body.fetchStatus).toBe("pending");
      expect(res.body.isRead).toBe(false);

      let stored = await ctx.prisma.bookmark.findUnique({ where: { id: res.body.id } });
      for (let attempt = 0; attempt < 20 && stored?.fetchStatus === "pending"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        stored = await ctx.prisma.bookmark.findUnique({ where: { id: res.body.id } });
      }
      expect(stored).toMatchObject({
        title: "Sample Article",
        contentMarkdown: "Hello world.",
        fetchStatus: "ok",
      });
    });

    it("creates an unfiled bookmark with an explicit null folderId", async () => {
      const { agent } = await setup();
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/article", folderId: null })
        .expect(201);
      expect(res.body.folderId).toBeNull();
    });

    it("stores the bookmark even when extraction fails", async () => {
      const { agent } = await setup();
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.org/nope" })
        .expect(201);
      // fake reader always succeeds, so drive failure through an invalid URL shape
      expect(res.body.url).toBe("https://example.org/nope");
    });

    it("rejects invalid payloads", async () => {
      const { agent } = await setup();
      const badUrl = await agent.post("/api/bookmarks").send({ url: "not-a-url" }).expect(400);
      expect(badUrl.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);

      const emptyFolder = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x", folderId: "" })
        .expect(400);
      expect(emptyFolder.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("creates a bookmark directly into an owned folder", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Filed" }).expect(201);
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/in-folder", folderId: folder.body.id })
        .expect(201);
      expect(res.body.folderId).toBe(folder.body.id);
    });

    it("returns 404 for a bookmark created in a missing folder", async () => {
      const { agent } = await setup();
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x", folderId: "does-not-exist" })
        .expect(404);
      expect(res.body.error.code).toBe(ErrorCode.FOLDER_NOT_FOUND);
    });

    it("lists only unfiled bookmarks when folderId is omitted", async () => {
      const { agent } = await setup();
      const unfiled = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/unfiled" })
        .expect(201);
      const folder = await agent.post("/api/folders").send({ name: "Filed" }).expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/filed", folderId: folder.body.id })
        .expect(201);

      const list = await agent.get("/api/bookmarks").expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0].id).toBe(unfiled.body.id);
      expect(list.body.items[0].folderId).toBeNull();
    });

    it("paginates unfiled bookmarks with a cursor", async () => {
      const { agent, userId } = await setup();
      // seed 25 unfiled bookmarks with spread timestamps
      const base = Date.now() - 60_000;
      await ctx.prisma.bookmark.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          userId,
          folderId: null,
          url: `https://example.com/p${i}`,
          title: `Post ${i}`,
          domain: "example.com",
          contentText: `body ${i}`,
          createdAt: new Date(base + i * 1000),
        })),
      });

      const page1 = await agent.get("/api/bookmarks?limit=10").expect(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.nextCursor).toBeTruthy();
      // newest first
      expect(page1.body.items[0].title).toBe("Post 24");

      const page2 = await agent
        .get(`/api/bookmarks?limit=10&cursor=${page1.body.nextCursor}`)
        .expect(200);
      expect(page2.body.items).toHaveLength(10);
      expect(page2.body.items[0].title).toBe("Post 14");

      const page3 = await agent
        .get(`/api/bookmarks?limit=10&cursor=${page2.body.nextCursor}`)
        .expect(200);
      expect(page3.body.items).toHaveLength(5);
      expect(page3.body.hasMore).toBe(false);
      expect(page3.body.nextCursor).toBeNull();
    });

    it("paginates a folder's bookmarks with a cursor", async () => {
      const { agent, userId } = await setup();
      const folder = await ctx.prisma.folder.create({
        data: { userId, name: "Paged" },
      });
      const base = Date.now() - 60_000;
      await ctx.prisma.bookmark.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          userId,
          folderId: folder.id,
          url: `https://example.com/f${i}`,
          title: `Folder post ${i}`,
          domain: "example.com",
          createdAt: new Date(base + i * 1000),
        })),
      });

      const page1 = await agent
        .get(`/api/bookmarks?folderId=${folder.id}&limit=10`)
        .expect(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.items[0].title).toBe("Folder post 11");

      const page2 = await agent
        .get(`/api/bookmarks?folderId=${folder.id}&limit=10&cursor=${page1.body.nextCursor}`)
        .expect(200);
      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.hasMore).toBe(false);
    });

    it("returns bookmark detail including contentHtml", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/article" })
        .expect(201);

      const detail = await agent.get(`/api/bookmarks/${created.body.id}`).expect(200);
      expect(detail.body.id).toBe(created.body.id);
      expect(detail.body.folderId).toBeNull();
      expect(detail.body.contentHtml).toBe("<p>Hello world.</p>");
    });

    it("toggles read state and deletes an unfiled bookmark without a folder token", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x" })
        .expect(201);

      const toggled = await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ isRead: true })
        .expect(200);
      expect(toggled.body.isRead).toBe(true);
      expect(toggled.body.folderId).toBeNull();

      await agent.delete(`/api/bookmarks/${created.body.id}`).expect(200);
      const after = await agent.get("/api/bookmarks").expect(200);
      expect(after.body.items).toHaveLength(0);
      await agent.get(`/api/bookmarks/${created.body.id}`).expect(404);
    });

    it("does not list or mutate another user's bookmarks", async () => {
      const { agent } = await setup();
      const other = await registerUser(ctx.app, "someone-else@ordo.app");
      const foreign = await ctx.prisma.bookmark.create({
        data: {
          userId: other.user.id,
          folderId: null,
          url: "https://example.com/foreign",
          title: "Foreign",
          domain: "example.com",
        },
      });

      const list = await agent.get("/api/bookmarks").expect(200);
      expect(list.body.items).toHaveLength(0);
      await agent.get(`/api/bookmarks/${foreign.id}`).expect(404);
      await agent
        .patch(`/api/bookmarks/${foreign.id}`)
        .send({ isRead: true })
        .expect(404);
      await agent.delete(`/api/bookmarks/${foreign.id}`).expect(404);
    });
  });

  describe("moving bookmarks between folders and unfiled", () => {
    it("moves an unfiled bookmark into a folder", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x" })
        .expect(201);
      const folder = await agent.post("/api/folders").send({ name: "Saved" }).expect(201);

      const moved = await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: folder.body.id })
        .expect(200);
      expect(moved.body.folderId).toBe(folder.body.id);

      const unfiled = await agent.get("/api/bookmarks").expect(200);
      expect(unfiled.body.items).toHaveLength(0);
      const filed = await agent.get(`/api/bookmarks?folderId=${folder.body.id}`).expect(200);
      expect(filed.body.items).toHaveLength(1);
    });

    it("moves a filed bookmark to unfiled with folderId null", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Saved" }).expect(201);
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x", folderId: folder.body.id })
        .expect(201);

      const moved = await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: null })
        .expect(200);
      expect(moved.body.folderId).toBeNull();

      const filed = await agent.get(`/api/bookmarks?folderId=${folder.body.id}`).expect(200);
      expect(filed.body.items).toHaveLength(0);
      const unfiled = await agent.get("/api/bookmarks").expect(200);
      expect(unfiled.body.items).toHaveLength(1);
    });

    it("moves a bookmark between two folders", async () => {
      const { agent } = await setup();
      const a = await agent.post("/api/folders").send({ name: "A" }).expect(201);
      const b = await agent.post("/api/folders").send({ name: "B" }).expect(201);
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x", folderId: a.body.id })
        .expect(201);

      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: b.body.id })
        .expect(200);

      expect((await agent.get(`/api/bookmarks?folderId=${a.body.id}`).expect(200)).body.items).toHaveLength(0);
      expect((await agent.get(`/api/bookmarks?folderId=${b.body.id}`).expect(200)).body.items).toHaveLength(1);
    });

    it("rejects moving into a missing folder and requires a field to update", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x" })
        .expect(201);

      const missing = await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: "no-such-folder" })
        .expect(404);
      expect(missing.body.error.code).toBe(ErrorCode.FOLDER_NOT_FOUND);

      const empty = await agent.patch(`/api/bookmarks/${created.body.id}`).send({}).expect(400);
      expect(empty.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe("mark all read", () => {
    it("marks only unfiled bookmarks when folderId is omitted", async () => {
      const { agent, userId } = await setup();
      const folder = await ctx.prisma.folder.create({
        data: { userId, name: "Filed" },
      });
      await ctx.prisma.bookmark.createMany({
        data: [
          {
            userId,
            folderId: null,
            url: "https://example.com/u1",
            title: "U1",
            domain: "example.com",
          },
          {
            userId,
            folderId: null,
            url: "https://example.com/u2",
            title: "U2",
            domain: "example.com",
          },
          {
            userId,
            folderId: folder.id,
            url: "https://example.com/f1",
            title: "F1",
            domain: "example.com",
          },
        ],
      });

      const res = await agent.post("/api/bookmarks/mark-all-read").send({}).expect(200);
      expect(res.body.updated).toBe(2);

      const unfiled = await agent.get("/api/bookmarks").expect(200);
      expect(unfiled.body.items.every((b: { isRead: boolean }) => b.isRead)).toBe(true);
      const filed = await agent.get(`/api/bookmarks?folderId=${folder.id}`).expect(200);
      expect(filed.body.items.every((b: { isRead: boolean }) => !b.isRead)).toBe(true);
    });

    it("marks only unfiled bookmarks with an explicit null folderId", async () => {
      const { agent, userId } = await setup();
      await ctx.prisma.bookmark.create({
        data: {
          userId,
          folderId: null,
          url: "https://example.com/n",
          title: "N",
          domain: "example.com",
        },
      });

      const res = await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: null })
        .expect(200);
      expect(res.body.updated).toBe(1);
    });

    it("marks all as read within one folder only", async () => {
      const { agent, userId } = await setup();
      const folderA = await ctx.prisma.folder.create({ data: { userId, name: "A" } });
      const folderB = await ctx.prisma.folder.create({ data: { userId, name: "B" } });
      await ctx.prisma.bookmark.createMany({
        data: [
          { userId, folderId: folderA.id, url: "https://example.com/a1", title: "A1", domain: "example.com" },
          { userId, folderId: folderA.id, url: "https://example.com/a2", title: "A2", domain: "example.com" },
          { userId, folderId: folderB.id, url: "https://example.com/b1", title: "B1", domain: "example.com" },
          { userId, folderId: null, url: "https://example.com/u1", title: "U1", domain: "example.com" },
        ],
      });

      const res = await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: folderA.id })
        .expect(200);
      expect(res.body.updated).toBe(2);

      const inB = await agent.get(`/api/bookmarks?folderId=${folderB.id}`).expect(200);
      expect(inB.body.items.every((b: { isRead: boolean }) => !b.isRead)).toBe(true);
      const unfiled = await agent.get("/api/bookmarks").expect(200);
      expect(unfiled.body.items.every((b: { isRead: boolean }) => !b.isRead)).toBe(true);
    });

    it("returns 404 for a missing folder and 400 for an empty-string folderId", async () => {
      const { agent } = await setup();
      const missing = await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: "no-such-folder" })
        .expect(404);
      expect(missing.body.error.code).toBe(ErrorCode.FOLDER_NOT_FOUND);

      const empty = await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: "" })
        .expect(400);
      expect(empty.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe("search", () => {
    it("searches across all of the user's bookmarks, filed and unfiled", async () => {
      const { agent, userId } = await setup();
      const folder = await ctx.prisma.folder.create({
        data: { userId, name: "Searchable" },
      });
      await ctx.prisma.bookmark.createMany({
        data: [
          {
            userId,
            folderId: null,
            url: "https://example.com/needle-unfiled",
            title: "Needle unfiled",
            domain: "example.com",
            contentText: "body",
          },
          {
            userId,
            folderId: folder.id,
            url: "https://example.com/needle-filed",
            title: "Needle filed",
            domain: "example.com",
            contentText: "body",
          },
          {
            userId,
            folderId: null,
            url: "https://example.com/haystack",
            title: "Haystack",
            domain: "example.com",
            contentText: "body",
          },
        ],
      });

      const res = await agent.get("/api/bookmarks/search?q=needle").expect(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items.map((b: { title: string }) => b.title).sort()).toEqual([
        "Needle filed",
        "Needle unfiled",
      ]);
    });
  });

  describe("folder protection", () => {
    it("locks a folder, blocks access without a token, and unlocks with the password", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Private" }).expect(201);
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/secret", folderId: folder.body.id })
        .expect(201);

      await agent
        .post(`/api/folders/${folder.body.id}/password`)
        .send({ password: "1234" })
        .expect(200);

      // protected now — list without token is blocked
      const blocked = await agent
        .get(`/api/bookmarks?folderId=${folder.body.id}`)
        .expect(403);
      expect(blocked.body.error.code).toBe(ErrorCode.FOLDER_PROTECTED);

      // wrong password
      const wrong = await agent
        .post(`/api/folders/${folder.body.id}/unlock`)
        .send({ password: "nope" })
        .expect(403);
      expect(wrong.body.error.code).toBe(ErrorCode.INVALID_FOLDER_PASSWORD);

      // correct password → token
      const unlocked = await agent
        .post(`/api/folders/${folder.body.id}/unlock`)
        .send({ password: "1234" })
        .expect(200);
      const token: string = unlocked.body.token;
      expect(token).toBeTruthy();

      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/new-secret", folderId: folder.body.id })
        .expect(403);
      await agent
        .post("/api/bookmarks")
        .set("x-folder-token", token)
        .send({ url: "https://example.com/new-secret", folderId: folder.body.id })
        .expect(201);

      await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: folder.body.id })
        .expect(403);
      const marked = await agent
        .post("/api/bookmarks/mark-all-read")
        .set("x-folder-token", token)
        .send({ folderId: folder.body.id })
        .expect(200);
      expect(marked.body.updated).toBe(2);

      // with token, list works
      const ok = await agent
        .get(`/api/bookmarks?folderId=${folder.body.id}`)
        .set("x-folder-token", token)
        .expect(200);
      expect(ok.body.items).toHaveLength(2);

      // removing the password opens the folder again
      await agent.delete(`/api/folders/${folder.body.id}/password`).expect(200);
      await agent.get(`/api/bookmarks?folderId=${folder.body.id}`).expect(200);
    });

    it("does not gate unfiled bookmarks on any folder token", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/open" })
        .expect(201);

      // even with protected folders around, unfiled bookmarks stay accessible
      const folder = await agent.post("/api/folders").send({ name: "Locked" }).expect(201);
      await agent.post(`/api/folders/${folder.body.id}/password`).send({ password: "1234" }).expect(200);

      await agent.get(`/api/bookmarks/${created.body.id}`).expect(200);
      await agent.patch(`/api/bookmarks/${created.body.id}`).send({ isRead: true }).expect(200);
      const list = await agent.get("/api/bookmarks").expect(200);
      expect(list.body.items).toHaveLength(1);
      await agent.delete(`/api/bookmarks/${created.body.id}`).expect(200);
    });

    it("requires a token to read or mutate a bookmark inside a protected folder", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Vault" }).expect(201);
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/secret", folderId: folder.body.id })
        .expect(201);

      await agent.post(`/api/folders/${folder.body.id}/password`).send({ password: "1234" }).expect(200);

      await agent.get(`/api/bookmarks/${created.body.id}`).expect(403);
      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ isRead: true })
        .expect(403);
      await agent.delete(`/api/bookmarks/${created.body.id}`).expect(403);

      // moving a bookmark OUT of a protected folder also requires the token
      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: null })
        .expect(403);

      const unlocked = await agent
        .post(`/api/folders/${folder.body.id}/unlock`)
        .send({ password: "1234" })
        .expect(200);
      const token: string = unlocked.body.token;

      const detail = await agent
        .get(`/api/bookmarks/${created.body.id}`)
        .set("x-folder-token", token)
        .expect(200);
      expect(detail.body.contentHtml).toBe("<p>Hello world.</p>");
    });

    it("requires a token to move a bookmark INTO a protected folder", async () => {
      const { agent } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x" })
        .expect(201);
      const folder = await agent.post("/api/folders").send({ name: "Vault" }).expect(201);
      await agent.post(`/api/folders/${folder.body.id}/password`).send({ password: "1234" }).expect(200);

      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: folder.body.id })
        .expect(403);

      const unlocked = await agent
        .post(`/api/folders/${folder.body.id}/unlock`)
        .send({ password: "1234" })
        .expect(200);
      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .set("x-folder-token", unlocked.body.token)
        .send({ folderId: folder.body.id })
        .expect(200);
    });

    it("deleting a protected folder requires no token (ownership only)", async () => {
      const { agent } = await setup();
      const folder = await agent.post("/api/folders").send({ name: "Bye" }).expect(201);
      await agent.post(`/api/folders/${folder.body.id}/password`).send({ password: "1234" }).expect(200);

      await agent.delete(`/api/folders/${folder.body.id}`).expect(200);
      expect((await agent.get("/api/folders").expect(200)).body).toHaveLength(0);
    });
  });
});
