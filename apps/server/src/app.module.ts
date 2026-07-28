import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { AuthModule } from "./auth/auth.module.js";
import { ServerModule } from "./server/server.module.js";

@Module({
  imports: [AppConfigModule, PrismaModule, AuthModule, ServerModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
