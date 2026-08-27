import { loadConfig } from "./configuration.js";

describe("loadConfig TRUST_PROXY", () => {
  const original = process.env.TRUST_PROXY;

  afterEach(() => {
    if (original === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = original;
  });

  it("defaults to 0 and honors a hop count", () => {
    delete process.env.TRUST_PROXY;
    expect(loadConfig().trustProxy).toBe(0);

    process.env.TRUST_PROXY = "1";
    expect(loadConfig().trustProxy).toBe(1);
  });
});
