import request from "supertest";
import { ErrorCode } from "@ordo/shared";
import {
  authedAgent,
  clearDb,
  createTestApp,
  registerUser,
  teardownApp,
  type TestCtx,
} from "./utils.js";

describe("Auth (e2e)", () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await teardownApp(ctx);
  });

  beforeEach(async () => {
    await clearDb(ctx.prisma);
  });

  describe("registration", () => {
    it("registers a new user, returns tokens for mobile, and creates a default folder", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .set("x-client-type", "mobile")
        .send({ email: "alice@ordo.app", password: "supersecret" })
        .expect(201);

      expect(res.body.user.email).toBe("alice@ordo.app");
      expect(res.body.tokens.accessToken).toBeTruthy();
      expect(res.body.tokens.refreshToken).toBeTruthy();
      expect(res.body.tokens.expiresIn).toBeGreaterThan(0);

      const folders = await ctx.prisma.folder.findMany({
        where: { userId: res.body.user.id },
      });
      expect(folders).toHaveLength(1);
      expect(folders[0].isDefault).toBe(true);
    });

    it("does not return tokens in the body for web clients (cookies instead)", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: "web@ordo.app", password: "supersecret" })
        .expect(201);

      expect(res.body.tokens.accessToken).toBe("");
      expect(res.body.tokens.refreshToken).toBe("");
      const cookies = res.headers["set-cookie"] as string[];
      expect(cookies?.some((c) => c.startsWith("ordo_access="))).toBe(true);
    });

    it("rejects duplicate emails with 409", async () => {
      await registerUser(ctx.app, "dup@ordo.app");
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .set("x-client-type", "mobile")
        .send({ email: "dup@ordo.app", password: "supersecret" })
        .expect(409);
      expect(res.body.error.code).toBe(ErrorCode.EMAIL_ALREADY_EXISTS);
    });

    it("validates the payload", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "short" })
        .expect(400);
      expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe("login", () => {
    it("logs in with correct credentials", async () => {
      await registerUser(ctx.app, "bob@ordo.app", "supersecret");
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: "bob@ordo.app", password: "supersecret" })
        .expect(200);
      expect(res.body.tokens.accessToken).toBeTruthy();
    });

    it("rejects wrong password with 401", async () => {
      await registerUser(ctx.app, "bob2@ordo.app", "supersecret");
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: "bob2@ordo.app", password: "wrongpassword" })
        .expect(401);
      expect(res.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it("does not reveal whether email exists (same error)", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: "ghost@ordo.app", password: "whatever123" })
        .expect(401);
      expect(res.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });
  });

  describe("authenticated routes", () => {
    it("rejects requests without a token", async () => {
      const res = await request(ctx.app.getHttpServer()).get("/api/auth/me").expect(401);
      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it("returns the current user with a valid bearer token", async () => {
      const agent = await authedAgent(ctx.app, "carol@ordo.app");
      const res = await agent.get("/api/auth/me").expect(200);
      expect(res.body.email).toBe("carol@ordo.app");
    });

    it("lists active sessions and marks the current one", async () => {
      const agent = await authedAgent(ctx.app, "dan@ordo.app");
      const res = await agent.get("/api/auth/sessions").expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].current).toBe(true);
    });
  });

  describe("refresh + logout", () => {
    it("rotates tokens on refresh and invalidates the old refresh", async () => {
      const auth = await registerUser(ctx.app, "eve@ordo.app");
      const res1 = await request(ctx.app.getHttpServer())
        .post("/api/auth/refresh")
        .set("x-client-type", "mobile")
        .send({ refreshToken: auth.tokens.refreshToken })
        .expect(200);
      expect(res1.body.tokens.accessToken).toBeTruthy();
      expect(res1.body.tokens.refreshToken).not.toBe(auth.tokens.refreshToken);

      // old refresh token no longer works
      await request(ctx.app.getHttpServer())
        .post("/api/auth/refresh")
        .set("x-client-type", "mobile")
        .send({ refreshToken: auth.tokens.refreshToken })
        .expect(401);

      // old access token is invalidated by rotation (lookup by hash fails)
      await request(ctx.app.getHttpServer())
        .get("/api/auth/me")
        .set("authorization", `Bearer ${auth.tokens.accessToken}`)
        .expect(401);
    });

    it("logs out and revokes the session instantly", async () => {
      const auth = await registerUser(ctx.app, "frank@ordo.app");
      const agent = request
        .agent(ctx.app.getHttpServer())
        .auth(auth.tokens.accessToken, { type: "bearer" });

      await agent.post("/api/auth/logout").expect(200);

      // access token no longer valid
      await request(ctx.app.getHttpServer())
        .get("/api/auth/me")
        .set("authorization", `Bearer ${auth.tokens.accessToken}`)
        .expect(401);
    });

    it("revokes another session by id", async () => {
      const auth = await registerUser(ctx.app, "grace@ordo.app");
      // create a second session
      const second = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: "grace@ordo.app", password: "password123" })
        .expect(200);

      const agent = request
        .agent(ctx.app.getHttpServer())
        .auth(auth.tokens.accessToken, { type: "bearer" });

      const sessions = await agent.get("/api/auth/sessions").expect(200);
      expect(sessions.body).toHaveLength(2);

      // revoke the second session
      const secondSession = sessions.body.find((s: { id: string }) => !s.current);
      await agent.delete(`/api/auth/sessions/${secondSession.id}`).expect(200);

      // second session's token is now dead
      await request(ctx.app.getHttpServer())
        .get("/api/auth/me")
        .set("authorization", `Bearer ${second.body.tokens.accessToken}`)
        .expect(401);
    });
  });
});
