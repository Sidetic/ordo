/**
 * Transactional email bodies. Table + inline CSS so they survive Gmail,
 * Apple Mail, and Mailpit. Mirrors the app's warm paper / coral palette.
 */

export const VERIFICATION_LOGO_CID = "ordo-logo";

const PAPER = "#EFE7D2";
const CARD = "#FBF6E6";
const RULE = "#E7DEC6";
const INK = "#15140F";
const MUTE = "#5A5448";
const FAINT = "#8B8676";
const CODE_WELL = "#F7F1DE";

/** Display size of the coral mark (source PNG is 3× for sharpness). */
const LOGO_W = 64;
const LOGO_H = 70;

export function verificationEmail(otp: string, expiresMinutes: number): {
  subject: string;
  text: string;
  html: string;
} {
  const code = otp.replace(/\D/g, "");
  const subject = "Your Ordo verification code";
  const text = [
    "Ordo",
    "",
    "Your verification code",
    "",
    code,
    "",
    `Expires in ${expiresMinutes} minutes.`,
    "If you didn't request this, you can ignore the email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(code)} is your verification code. It expires in ${expiresMinutes} minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td align="center" style="background:${CARD};border:1px solid ${RULE};border-radius:24px;padding:36px 32px 32px;">
              <img src="cid:${VERIFICATION_LOGO_CID}" width="${LOGO_W}" height="${LOGO_H}" alt="Ordo" style="display:block;margin:0 auto 28px;border:0;outline:none;text-decoration:none;" />
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${FAINT};">
                Verification
              </p>
              <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.5;color:${MUTE};">
                Enter this code in Ordo to continue.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
                <tr>
                  <td align="center" style="background:${CODE_WELL};border:1px solid ${RULE};border-radius:14px;padding:20px 12px;">
                    <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:600;letter-spacing:0.28em;color:${INK};">
                      ${escapeHtml(code)}
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:${FAINT};">
                Expires in ${expiresMinutes} minutes. If you didn't request this, ignore the email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
