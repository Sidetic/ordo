import { passwordResetEmail, verificationEmail } from "./mail.templates.js";

describe("verificationEmail", () => {
  it("includes the code in subject-adjacent text and html", () => {
    const mail = verificationEmail("482193", 10);
    expect(mail.subject).toBe("Your Ordo verification code");
    expect(mail.text).toContain("482193");
    expect(mail.text).toContain("Expires in 10 minutes");
    expect(mail.html).toContain("482193");
    expect(mail.html).toContain("Expires in 10 minutes");
    expect(mail.html).toContain("cid:ordo-logo");
    expect(mail.html).toContain('alt="Ordo"');
    expect(mail.html).toContain("border-radius:24px");
  });

  it("strips non-digits from the displayed code", () => {
    const mail = verificationEmail("12 34-56", 10);
    expect(mail.text).toContain("123456");
    expect(mail.html).toContain("123456");
    expect(mail.html).not.toContain("12 34-56");
  });
});

describe("passwordResetEmail", () => {
  it("uses reset copy and includes the code", () => {
    const mail = passwordResetEmail("482193", 10);
    expect(mail.subject).toBe("Your Ordo password reset code");
    expect(mail.text).toContain("Your password reset code");
    expect(mail.text).toContain("482193");
    expect(mail.html).toContain("Password reset");
    expect(mail.html).toContain("482193");
    expect(mail.html).toContain("choose a new password");
  });
});
