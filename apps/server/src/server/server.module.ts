import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller.js";

@Module({
  controllers: [ServerController],
})
export class ServerModule {}
