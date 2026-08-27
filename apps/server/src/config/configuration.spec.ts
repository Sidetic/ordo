import { loadConfig } from "./configuration.js";

describe("loadConfig rate-limit flags", () => {
  const original = {
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    TRUST_PROXY: process.env.TRUST_PROXY,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterEach(() => {
    restore("RATE_LIMIT_ENABLED", original.RATE_LIMIT_ENABLED);
    restore("TRUST_PROXY", original.TRUST_PROXY);
    restore("NODE_ENV", original.NODE_ENV);
  });

  it("defaults TRUST_PROXY to 0", () => {
    delete process.env.TRUST_PROXY;
    expect(loadConfig().trustProxy).toBe(0);
  });

  it("defaults to off in test and on otherwise", () => {
    delete process.env.RATE_LIMIT_ENABLED;
    process.env.NODE_ENV = "test";
    expect(loadConfig().rateLimitEnabled).toBe(false);

    process.env.NODE_ENV = "development";
    expect(loadConfig().rateLimitEnabled).toBe(true);
  });

  it("honors RATE_LIMIT_ENABLED and TRUST_PROXY", () => {
    process.env.RATE_LIMIT_ENABLED = "false";
    process.env.TRUST_PROXY = "1";
    const cfg = loadConfig();
    expect(cfg.rateLimitEnabled).toBe(false);
    expect(cfg.trustProxy).toBe(1);

    process.env.RATE_LIMIT_ENABLED = "true";
    expect(loadConfig().rateLimitEnabled).toBe(true);
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
