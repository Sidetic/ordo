import request from "supertest";
import { DEFAULT_FOLDER_ICON, DEFAULT_FOLDER_NAME, ErrorCode } from "@ordo/shared";
import { ReaderService } from "../src/bookmarks/reader.service.js";
import {
  authedAgent,
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
  let defaultFolderId: string;

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

  async function setup() {
    const auth = await registerUser(ctx.app, "reader@ordo.app");
    const agent = request.agent(ctx.app.getHttpServer()).auth(auth.tokens.accessToken, {
      type: "bearer",
    });
    const folders = (await agent.get("/api/folders").expect(200)).body;
    defaultFolderId = folders[0].id;
    return { agent, userId: auth.user.id, defaultFolderId: folders[0].id };
  }

  describe("folders", () => {
    it("creates, lists, renames, and deletes folders", async () => {
      const { agent } = await setup();

      const created = await agent
        .post("/api/folders")
        .send({ name: "Reading" })
        .expect(201);
      expect(created.body.name).toBe("Reading");
      expect(created.body.icon).toBe("folder-outline");
      expect(created.body.pinned).toBe(false);
      expect(created.body.protected).toBe(false);

      const list = await agent.get("/api/folders").expect(200);
      expect(list.body).toHaveLength(2);

      await agent.patch(`/api/folders/${created.body.id}`).send({ name: "Read Later" }).expect(200);

      await agent.delete(`/api/folders/${created.body.id}`).expect(200);
      const after = await agent.get("/api/folders").expect(200);
      expect(after.body).toHaveLength(1);
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
      const { agent, defaultFolderId } = await setup();
      await ctx.prisma.folder.update({
        where: { id: defaultFolderId },
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

    it("lists the default folder first, then pinned, then creation order", async () => {
      const { agent } = await setup();
      const alpha = await agent.post("/api/folders").send({ name: "Alpha" }).expect(201);
      const beta = await agent.post("/api/folders").send({ name: "Beta" }).expect(201);
      const gamma = await agent.post("/api/folders").send({ name: "Gamma" }).expect(201);

      const names = async () => {
        const res = await agent.get("/api/folders").expect(200);
        return res.body.map((f: { name: string }) => f.name);
      };

      await agent.patch(`/api/folders/${gamma.body.id}`).send({ pinned: true }).expect(200);
      expect(await names()).toEqual([DEFAULT_FOLDER_NAME, "Gamma", "Alpha", "Beta"]);

      await agent.patch(`/api/folders/${alpha.body.id}`).send({ pinned: true }).expect(200);
      expect(await names()).toEqual([DEFAULT_FOLDER_NAME, "Alpha", "Gamma", "Beta"]);

      await agent.patch(`/api/folders/${gamma.body.id}`).send({ pinned: false }).expect(200);
      expect(await names()).toEqual([DEFAULT_FOLDER_NAME, "Alpha", "Beta", "Gamma"]);
    });

    it("refuses to delete the default folder", async () => {
      const { agent, defaultFolderId } = await setup();
      const res = await agent.delete(`/api/folders/${defaultFolderId}`).expect(403);
      expect(res.body.error.code).toBe(ErrorCode.DEFAULT_FOLDER_IMMUTABLE);
    });

    it("deletes a non-empty folder and cascades its bookmarks", async () => {
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
      expect(after.body).toHaveLength(1);

      const gone = await agent.get(`/api/bookmarks/${b1.body.id}`).expect(404);
      expect(gone.body.error.code).toBe(ErrorCode.BOOKMARK_NOT_FOUND);
    });

    it("reports folder counts (total + unread)", async () => {
      const { agent, defaultFolderId } = await setup();
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/1", folderId: defaultFolderId })
        .expect(201);
      const b2 = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/2", folderId: defaultFolderId })
        .expect(201);

      await agent.patch(`/api/bookmarks/${b2.body.id}`).send({ isRead: true }).expect(200);

      const folders = (await agent.get("/api/folders").expect(200)).body;
      const def = folders.find((f: { isDefault?: boolean }) => f.id === defaultFolderId);
      expect(def.bookmarkCount).toBe(2);
      expect(def.unreadCount).toBe(1);
    });
  });

  describe("bookmarks CRUD", () => {
    it("creates a bookmark with extracted content", async () => {
      const { agent, defaultFolderId } = await setup();
      const res = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/article", folderId: defaultFolderId })
        .expect(201);
      expect(res.body.title).toBe("Sample Article");
      expect(res.body.domain).toBe("example.com");
      expect(res.body.contentMarkdown).toBe("Hello world.");
      expect(res.body.isRead).toBe(false);
    });

    it("lists bookmarks and returns pagination cursor", async () => {
      const { agent, userId, defaultFolderId } = await setup();
      // seed 25 bookmarks with spread timestamps
      const base = Date.now() - 60_000;
      await ctx.prisma.bookmark.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          userId,
          folderId: defaultFolderId,
          url: `https://example.com/p${i}`,
          title: `Post ${i}`,
          domain: "example.com",
          contentText: `body ${i}`,
          createdAt: new Date(base + i * 1000),
        })),
      });

      const page1 = await agent.get(`/api/bookmarks?folderId=${defaultFolderId}&limit=10`).expect(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.nextCursor).toBeTruthy();
      // newest first
      expect(page1.body.items[0].title).toBe("Post 24");

      const page2 = await agent
        .get(`/api/bookmarks?folderId=${defaultFolderId}&limit=10&cursor=${page1.body.nextCursor}`)
        .expect(200);
      expect(page2.body.items).toHaveLength(10);
      expect(page2.body.items[0].title).toBe("Post 14");

      const page3 = await agent
        .get(`/api/bookmarks?folderId=${defaultFolderId}&limit=10&cursor=${page2.body.nextCursor}`)
        .expect(200);
      expect(page3.body.items).toHaveLength(5);
      expect(page3.body.hasMore).toBe(false);
      expect(page3.body.nextCursor).toBeNull();
    });

    it("toggles read, moves between folders, searches, and deletes", async () => {
      const { agent, defaultFolderId } = await setup();
      const created = await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/x", folderId: defaultFolderId })
        .expect(201);

      const toggled = await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ isRead: true })
        .expect(200);
      expect(toggled.body.isRead).toBe(true);

      const newFolder = await agent.post("/api/folders").send({ name: "Saved" }).expect(201);
      await agent
        .patch(`/api/bookmarks/${created.body.id}`)
        .send({ folderId: newFolder.body.id })
        .expect(200);

      const inDefault = await agent
        .get(`/api/bookmarks?folderId=${defaultFolderId}`)
        .expect(200);
      expect(inDefault.body.items).toHaveLength(0);

      const inSaved = await agent
        .get(`/api/bookmarks?folderId=${newFolder.body.id}`)
        .expect(200);
      expect(inSaved.body.items).toHaveLength(1);

      const search = await agent.get(`/api/bookmarks/search?q=Sample`).expect(200);
      expect(search.body.items).toHaveLength(1);

      await agent.delete(`/api/bookmarks/${created.body.id}`).expect(200);
      const after = await agent
        .get(`/api/bookmarks?folderId=${newFolder.body.id}`)
        .expect(200);
      expect(after.body.items).toHaveLength(0);
    });

    it("marks all as read in a folder", async () => {
      const { agent, userId, defaultFolderId } = await setup();
      await ctx.prisma.bookmark.createMany({
        data: Array.from({ length: 3 }, (_, i) => ({
          userId,
          folderId: defaultFolderId,
          url: `https://example.com/m${i}`,
          title: `M ${i}`,
          domain: "example.com",
        })),
      });
      const res = await agent
        .post("/api/bookmarks/mark-all-read")
        .send({ folderId: defaultFolderId })
        .expect(200);
      expect(res.body.updated).toBe(3);
      const list = await agent.get(`/api/bookmarks?folderId=${defaultFolderId}`).expect(200);
      expect(list.body.items.every((b: { isRead: boolean }) => b.isRead)).toBe(true);
    });
  });

  describe("folder protection", () => {
    it("locks a folder, blocks access without a token, and unlocks with the password", async () => {
      const { agent, defaultFolderId } = await setup();
      await agent
        .post("/api/bookmarks")
        .send({ url: "https://example.com/secret", folderId: defaultFolderId })
        .expect(201);

      await agent
        .post(`/api/folders/${defaultFolderId}/password`)
        .send({ password: "1234" })
        .expect(200);

      // protected now — list without token is blocked
      const blocked = await agent
        .get(`/api/bookmarks?folderId=${defaultFolderId}`)
        .expect(403);
      expect(blocked.body.error.code).toBe(ErrorCode.FOLDER_PROTECTED);

      // wrong password
      const wrong = await agent
        .post(`/api/folders/${defaultFolderId}/unlock`)
        .send({ password: "nope" })
        .expect(403);
      expect(wrong.body.error.code).toBe(ErrorCode.INVALID_FOLDER_PASSWORD);

      // correct password → token
      const unlocked = await agent
        .post(`/api/folders/${defaultFolderId}/unlock`)
        .send({ password: "1234" })
        .expect(200);
      const token: string = unlocked.body.token;
      expect(token).toBeTruthy();

      // with token, list works
      const ok = await agent
        .get(`/api/bookmarks?folderId=${defaultFolderId}`)
        .set("x-folder-token", token)
        .expect(200);
      expect(ok.body.items).toHaveLength(1);

      // removing the password opens the folder again
      await agent.delete(`/api/folders/${defaultFolderId}/password`).expect(200);
      await agent.get(`/api/bookmarks?folderId=${defaultFolderId}`).expect(200);
    });
  });
});
