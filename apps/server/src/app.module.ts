import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { ClientIpMiddleware } from "./common/middleware/client-ip.middleware.js";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BookmarksModule } from "./bookmarks/bookmarks.module.js";
import { ServerModule } from "./server/server.module.js";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RateLimitModule,
    AuthModule,
    BookmarksModule,
    ServerModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClientIpMiddleware).forRoutes("*");
  }
}
