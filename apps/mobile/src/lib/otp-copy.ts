/**
 * Copy for OTP request / verify screens. Switches on whether the connected
 * server actually delivers mail (SMTP_URL) or prints codes to its console.
 */

export function otpRequestFooter(
  smtpConfigured: boolean | undefined,
  kind: "email-change" | "reset",
): string {
  if (smtpConfigured === false) {
    return kind === "email-change"
      ? "This server isn't sending mail. The code will be printed in the server console."
      : "If an account exists, the reset code will be printed in the server console.";
  }
  return kind === "email-change"
    ? "A verification code will be sent to your new address."
    : "If an account exists, we'll email a reset code.";
}

export function otpSentToast(
  smtpConfigured: boolean | undefined,
  address: string,
): string {
  if (smtpConfigured === false) {
    return "Code printed in the server console";
  }
  return `Code sent to ${address}`;
}

export function otpEnterHelper(
  smtpConfigured: boolean | undefined,
  address?: string,
): string {
  if (smtpConfigured === false) {
    return "Enter the 6-digit code printed in the server console.";
  }
  if (address) return `Enter the code sent to ${address}.`;
  return "Enter the 6-digit code sent to your inbox.";
}

export function otpVerifySubtitle(smtpConfigured: boolean | undefined): string {
  if (smtpConfigured === false) {
    return "This server isn't sending mail. Enter the 6-digit code from the server console.";
  }
  return "We sent a 6-digit code to your inbox. Enter it below to continue.";
}
