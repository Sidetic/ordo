import request from "supertest";
import { ErrorCode } from "@ordo/shared";
import { ReaderService } from "../src/bookmarks/reader.service.js";
import { RateLimitService } from "../src/common/rate-limit/rate-limit.service.js";
import { LOGIN_ACCOUNT, RATE_LIMIT } from "../src/common/rate-limit/policies.js";
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
  author: "Jane Doe",
  publishedAt: "2026-01-15T09:30:00.000Z",
  domain: "example.com",
  readingTimeMinutes: 4,
  contentHtml: "<p>Hello world.</p>",
  contentMarkdown: "Hello world.",
  contentText: "Hello world.",
};

describe("Rate limiting (e2e)", () => {
  let ctx: TestCtx;
  let limiter: RateLimitService;

  beforeAll(async () => {
    ctx = await createTestApp({
      config: { rateLimitEnabled: true, trustProxy: 0 },
      customize: (b) =>
        b.overrideProvider(ReaderService).useValue({
          extract: async () => ({ ...FAKE_EXTRACTED }),
        } as unknown as ReaderService),
    });
    limiter = ctx.app.get(RateLimitService);
  });

  afterAll(async () => {
    await teardownApp(ctx);
  });

  beforeEach(async () => {
    await clearDb(ctx.prisma);
    limiter.resetAll();
  });

  function expectRateLimited(res: { status: number; headers: Record<string, string>; body: any }) {
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(res.body.error.message).toMatch(/too many/i);
    expect(res.body.error.details.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(Number(res.headers["retry-after"])).toBe(res.body.error.details.retryAfterSeconds);
  }

  describe("register", () => {
    it("rejects a sixth signup from the same IP", async () => {
      for (let i = 0; i < RATE_LIMIT.registerIp.limit; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/register")
          .set("x-client-type", "mobile")
          .send({
            displayName: `user${i}`,
            email: `user${i}@ordo.app`,
            password: "supersecret",
          })
          .expect(201);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .set("x-client-type", "mobile")
        .send({
          displayName: "useroverflow",
          email: "useroverflow@ordo.app",
          password: "supersecret",
        });
      expectRateLimited(res);
      expect(res.body.error.message).toMatch(/registration/i);
    });

    it("cannot be bypassed with a spoofed X-Forwarded-For when TRUST_PROXY is 0", async () => {
      for (let i = 0; i < RATE_LIMIT.registerIp.limit; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/register")
          .set("x-client-type", "mobile")
          .send({
            displayName: `spoof${i}`,
            email: `spoof${i}@ordo.app`,
            password: "supersecret",
          })
          .expect(201);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .set("x-client-type", "mobile")
        .set("x-forwarded-for", "203.0.113.99")
        .send({
          displayName: "spoofbypass",
          email: "spoofbypass@ordo.app",
          password: "supersecret",
        });
      expectRateLimited(res);
    });
  });

  describe("login", () => {
    it("locks an account after too many failures, including the correct password", async () => {
      await registerUser(ctx.app, "lockme@ordo.app", "supersecret", "lockme");

      for (let i = 0; i < LOGIN_ACCOUNT.maxFailures; i++) {
        const res = await request(ctx.app.getHttpServer())
          .post("/api/auth/login")
          .set("x-client-type", "mobile")
          .send({ identifier: "lockme@ordo.app", password: "wrongpassword" })
          .expect(401);
        expect(res.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      }

      const blocked = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ identifier: "lockme@ordo.app", password: "supersecret" });
      expectRateLimited(blocked);
      expect(blocked.body.error.message).toMatch(/login attempts/i);
      expect(blocked.body.error.details.retryAfterSeconds).toBe(LOGIN_ACCOUNT.lockMs[0] / 1000);
    });

    it("shares the lock between identifier and email fields for the same account", async () => {
      await registerUser(ctx.app, "shared@ordo.app", "supersecret", "sharedname");
      for (let i = 0; i < LOGIN_ACCOUNT.maxFailures; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/login")
          .set("x-client-type", "mobile")
          .send({ identifier: "shared@ordo.app", password: "wrongpassword" })
          .expect(401);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ email: "shared@ordo.app", password: "wrongpassword" });
      expectRateLimited(res);
    });

    it("stops spraying guesses across many accounts from one IP", async () => {
      for (let i = 0; i < RATE_LIMIT.loginIp.limit; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/login")
          .set("x-client-type", "mobile")
          .send({ identifier: `ghost${i}@ordo.app`, password: "wrongpassword" })
          .expect(401);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .set("x-client-type", "mobile")
        .send({ identifier: "ghost-final@ordo.app", password: "wrongpassword" });
      expectRateLimited(res);
      expect(res.body.error.message).toMatch(/network/i);
    });
  });

  describe("password reset", () => {
    it("limits forgot-password emails", async () => {
      for (let i = 0; i < RATE_LIMIT.forgotPasswordEmail.limit; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/forgot-password")
          .send({ email: "bomb@ordo.app" })
          .expect(200);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/forgot-password")
        .send({ email: "bomb@ordo.app" });
      expectRateLimited(res);
      expect(res.body.error.message).toMatch(/password-reset requests/i);
    });

    it("limits reset-password attempts from one IP", async () => {
      for (let i = 0; i < RATE_LIMIT.resetPasswordIp.limit; i++) {
        await request(ctx.app.getHttpServer())
          .post("/api/auth/reset-password")
          .send({
            email: "nobody@ordo.app",
            token: "000000",
            newPassword: "brandnewpass",
          })
          .expect(400);
      }
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/reset-password")
        .send({
          email: "nobody@ordo.app",
          token: "000000",
          newPassword: "brandnewpass",
        });
      expectRateLimited(res);
    });
  });

  describe("reader", () => {
    it("limits bookmark creates per user", async () => {
      const auth = await registerUser(ctx.app, "fetch@ordo.app");
      const agent = request.agent(ctx.app.getHttpServer()).auth(auth.tokens.accessToken, {
        type: "bearer",
      });
      for (let i = 0; i < RATE_LIMIT.bookmarkCreateUser.limit; i++) {
        await agent
          .post("/api/bookmarks")
          .send({ url: `https://example.com/article-${i}` })
          .expect(201);
      }
      const res = await agent.post("/api/bookmarks").send({ url: "https://example.com/overflow" });
      expectRateLimited(res);
      expect(res.body.error.message).toMatch(/URLs fetched/i);
    });
  });
});

describe("Rate limiting behind a trusted proxy (e2e)", () => {
  let ctx: TestCtx;
  let limiter: RateLimitService;

  beforeAll(async () => {
    ctx = await createTestApp({
      config: { rateLimitEnabled: true, trustProxy: 1 },
    });
    limiter = ctx.app.get(RateLimitService);
  });

  afterAll(async () => {
    await teardownApp(ctx);
  });

  beforeEach(async () => {
    await clearDb(ctx.prisma);
    limiter.resetAll();
  });

  it("keys limits on X-Forwarded-For when TRUST_PROXY is 1", async () => {
    for (let i = 0; i < RATE_LIMIT.registerIp.limit; i++) {
      await request(ctx.app.getHttpServer())
        .post("/api/auth/register")
        .set("x-client-type", "mobile")
        .set("x-forwarded-for", "203.0.113.10")
        .send({
          displayName: `proxy${i}`,
          email: `proxy${i}@ordo.app`,
          password: "supersecret",
        })
        .expect(201);
    }
    const blocked = await request(ctx.app.getHttpServer())
      .post("/api/auth/register")
      .set("x-client-type", "mobile")
      .set("x-forwarded-for", "203.0.113.10")
      .send({
        displayName: "proxysame",
        email: "proxysame@ordo.app",
        password: "supersecret",
      });
    expect(blocked.status).toBe(429);

    await request(ctx.app.getHttpServer())
      .post("/api/auth/register")
      .set("x-client-type", "mobile")
      .set("x-forwarded-for", "203.0.113.20")
      .send({
        displayName: "proxyother",
        email: "proxyother@ordo.app",
        password: "supersecret",
      })
      .expect(201);
  });
});
