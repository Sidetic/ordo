import { existsSync } from "node:fs";
import { join } from "node:path";
import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { EMAIL_OTP } from "@ordo/shared";
import { APP_CONFIG } from "../config/config.module.js";
import type { AppConfig } from "../config/config.module.js";
import { VERIFICATION_LOGO_CID, verificationEmail } from "./mail.templates.js";

/** Resolved from both `src/auth` and compiled `dist/auth`. */
function emailLogoPath(): string {
  return join(__dirname, "..", "..", "assets", "email-logo.png");
}

/**
 * Email delivery. Uses SMTP when SMTP_URL is configured, otherwise logs to the
 * console (dev mode). Only invoked when email verification is enabled.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;

  constructor(@Inject(APP_CONFIG) cfg: AppConfig) {
    this.from = cfg.smtpFrom;
    if (cfg.smtpUrl) {
      try {
        this.transporter = nodemailer.createTransport(cfg.smtpUrl);
      } catch (err) {
        this.logger.warn(
          `Failed to initialize SMTP transport, falling back to console: ${(err as Error).message}`,
        );
        this.transporter = null;
      }
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendVerification(to: string, token: string): Promise<void> {
    const minutes = Math.round(EMAIL_OTP.TTL_MS / 60_000);
    const { subject, text, html } = verificationEmail(token, minutes);
    await this.send({ to, subject, text, html });
  }

  private async send(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[console-mail] -> ${opts.to}\n${opts.subject}\n${opts.text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: logoAttachment(),
    });
  }
}

function logoAttachment(): Array<{
  filename: string;
  path: string;
  cid: string;
  contentDisposition: "inline";
}> {
  const path = emailLogoPath();
  if (!existsSync(path)) return [];
  return [
    {
      filename: "ordo-logo.png",
      path,
      cid: VERIFICATION_LOGO_CID,
      contentDisposition: "inline",
    },
  ];
}
