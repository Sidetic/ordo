import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { APP_CONFIG, type AppConfig } from "../../config/config.module.js";
import { attachClientIp } from "../utils/request.js";

/** Resolve the client IP once per request using TRUST_PROXY hop count. */
@Injectable()
export class ClientIpMiddleware implements NestMiddleware {
  constructor(@Inject(APP_CONFIG) private readonly cfg: AppConfig) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    attachClientIp(req, this.cfg.trustProxy);
    next();
  }
}
