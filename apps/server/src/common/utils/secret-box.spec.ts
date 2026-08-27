import { decryptSecret, deriveKey, encryptSecret } from "./secret-box.js";
import { generateBackupCodes, hashBackupCode, normalizeBackupCode } from "./backup-codes.js";

describe("secret-box", () => {
  it("round-trips a TOTP secret", () => {
    const key = deriveKey("test-secret", "totp-secret-enc");
    const packed = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(decryptSecret(packed, key)).toBe("JBSWY3DPEHPK3PXP");
  });
});

describe("backup-codes", () => {
  it("generates 10 unique hyphenated codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/);
    }
  });

  it("hashes independently of hyphens and case", () => {
    const secret = "pepper";
    expect(hashBackupCode("Abcd-Efgh", secret)).toBe(hashBackupCode("abcdefgh", secret));
    expect(normalizeBackupCode("AB-CD-efgh")).toBe("abcdefgh");
  });
});
