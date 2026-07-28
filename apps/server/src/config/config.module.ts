import { Global, Module } from "@nestjs/common";
import { loadConfig } from "./configuration.js";

export const APP_CONFIG = "APP_CONFIG";

export type AppConfig = ReturnType<typeof loadConfig>;

function buildConfig() {
  return loadConfig();
}

/** Global module exposing the resolved, typed app configuration. */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: buildConfig }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
