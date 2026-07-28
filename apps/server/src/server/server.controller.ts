import { Controller, Get, Inject } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.module.js";
import type { AppConfig } from "../config/config.module.js";
import type { ServerInfoDto } from "@ordo/shared";

const VERSION = "0.1.0";

@Controller("api/server")
export class ServerController {
  constructor(@Inject(APP_CONFIG) private readonly cfg: AppConfig) {}

  @Get("info")
  info(): ServerInfoDto {
    return {
      name: "Ordo",
      version: VERSION,
      registrationEnabled: this.cfg.registrationEnabled,
      emailVerificationRequired: this.cfg.emailVerificationRequired,
    };
  }
}
