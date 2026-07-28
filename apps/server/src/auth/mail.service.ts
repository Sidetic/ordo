import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { APP_CONFIG } from "../config/config.module.js";
import type { AppConfig } from "../config/config.module.js";

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
    const subject = "Verify your Ordo account";
    const text = `Welcome to Ordo!\n\nYour verification token is:\n\n${token}\n\nUse it to verify your email address.`;
    await this.send({ to, subject, text });
  }

  private async send(opts: { to: string; subject: string; text: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[console-mail] -> ${opts.to}\n${opts.subject}\n${opts.text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to: opts.to, subject: opts.subject, text: opts.text });
  }
}
