import { Test } from "@nestjs/testing";
import { TokenService } from "./token.service.js";

describe("TokenService", () => {
  let svc: TokenService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [TokenService],
    }).compile();
    svc = mod.get(TokenService);
  });

  it("generates a non-empty token pair with distinct access/refresh", () => {
    const pair = svc.generatePair();
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(pair.accessToken).not.toBe(pair.refreshToken);
    expect(pair.accessHash).not.toBe(pair.accessToken);
    expect(pair.refreshHash).not.toBe(pair.refreshToken);
    expect(pair.expiresIn).toBeGreaterThan(0);
  });

  it("expires access before refresh", () => {
    const pair = svc.generatePair();
    expect(pair.accessTokenExpiresAt.getTime()).toBeLessThan(
      pair.refreshTokenExpiresAt.getTime(),
    );
  });

  it("hashes the same token deterministically", () => {
    const pair = svc.generatePair();
    expect(svc.hash(pair.accessToken)).toBe(pair.accessHash);
  });

  it("generates unique tokens each call", () => {
    const a = svc.generatePair();
    const b = svc.generatePair();
    expect(a.accessToken).not.toBe(b.accessToken);
    expect(a.refreshToken).not.toBe(b.refreshToken);
  });

  it("generates a folder token with matching hash", () => {
    const ft = svc.generateFolderToken();
    expect(ft.token).toBeTruthy();
    expect(svc.hash(ft.token)).toBe(ft.hash);
  });
});
