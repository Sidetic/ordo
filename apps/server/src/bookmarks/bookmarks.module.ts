import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { FoldersController } from "./folders.controller.js";
import { FoldersService } from "./folders.service.js";
import { BookmarksController } from "./bookmarks.controller.js";
import { BookmarksService } from "./bookmarks.service.js";
import { ReaderService } from "./reader.service.js";
import { FolderTokenService } from "./folder-token.service.js";
import { FolderAccessService } from "./folder-access.service.js";

@Module({
  imports: [AuthModule],
  controllers: [FoldersController, BookmarksController],
  providers: [
    FoldersService,
    BookmarksService,
    ReaderService,
    FolderTokenService,
    FolderAccessService,
  ],
})
export class BookmarksModule {}
