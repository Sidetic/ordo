import { SetFolderPasswordSchema } from "@ordo/shared";

describe("folder lock credential validation", () => {
  it("treats legacy requests as text passwords", () => {
    expect(SetFolderPasswordSchema.parse({ password: "correct horse" })).toEqual({
      password: "correct horse",
      lockType: "password",
    });
  });

  it.each([
    [{ password: "1234", lockType: "pin" }, true],
    [{ password: "123456", lockType: "pin" }, true],
    [{ password: "12345", lockType: "pin" }, false],
    [{ password: "12ab", lockType: "pin" }, false],
    [{ password: "12345678", lockType: "pin" }, false],
    [{ password: "0-1-4-7", lockType: "pattern" }, true],
    [{ password: "0-1-0-2", lockType: "pattern" }, false],
    [{ password: "a".repeat(64), lockType: "device" }, true],
    [{ password: "too-short", lockType: "device" }, false],
  ])("validates %p", (input, valid) => {
    expect(SetFolderPasswordSchema.safeParse(input).success).toBe(valid);
  });
});
