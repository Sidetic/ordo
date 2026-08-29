import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ReaderService } from "../bookmarks/reader.service.js";
import { ImportExportController } from "./import-export.controller.js";
import { ImportService } from "./import.service.js";
import { ExportService } from "./export.service.js";

/**
 * Import / export feature. Provides its own stateless ReaderService instance
 * for background re-extraction of imported bookmarks.
 */
@Module({
  imports: [AuthModule],
  controllers: [ImportExportController],
  providers: [ImportService, ExportService, ReaderService],
})
export class ImportExportModule {}
