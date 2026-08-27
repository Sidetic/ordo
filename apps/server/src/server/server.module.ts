import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ServerController } from "./server.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [ServerController],
})
export class ServerModule {}
