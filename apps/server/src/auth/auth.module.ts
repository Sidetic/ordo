import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";
import { MailService } from "./mail.service.js";
import { AuthGuard } from "./auth.guard.js";
import { MfaService } from "./mfa.service.js";
import { AvatarService } from "./avatar.service.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TokenService,
    MailService,
    AuthGuard,
    MfaService,
    AvatarService,
  ],
  exports: [AuthService, SessionService, TokenService, MailService, AuthGuard, MfaService],
})
export class AuthModule {}
