import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BookmarksModule } from "../bookmarks/bookmarks.module.js";
import { ImportExportController } from "./import-export.controller.js";
import { ImportService } from "./import.service.js";
import { ExportService } from "./export.service.js";

@Module({
  imports: [AuthModule, BookmarksModule],
  controllers: [ImportExportController],
  providers: [ImportService, ExportService],
})
export class ImportExportModule {}
