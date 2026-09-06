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
      ? "The code will print in the server console."
      : "If the account exists, the code prints in the server console.";
  }
  return kind === "email-change"
    ? "We'll send a code to the new address."
    : "If the account exists, we'll email a reset code.";
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
    return "Enter the 6-digit code from the server console.";
  }
  if (address) return `Enter the code sent to ${address}.`;
  return "Enter the 6-digit code from your inbox.";
}

export function otpVerifySubtitle(smtpConfigured: boolean | undefined): string {
  if (smtpConfigured === false) {
    return "Enter the 6-digit code from the server console.";
  }
  return "Enter the 6-digit code from your inbox.";
}
