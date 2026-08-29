import { Injectable } from "@nestjs/common";
import type { Folder } from "@prisma/client";
import { ErrorCode } from "@ordo/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppError } from "../common/errors/app-error.js";
import { FolderTokenService } from "./folder-token.service.js";

/**
 * Loads a folder, enforces ownership, and enforces password protection.
 * Throws FOLDER_NOT_FOUND (404) or FOLDER_PROTECTED (403) as appropriate.
 * Returns the resolved folder for reuse by callers (avoids a second query).
 */
@Injectable()
export class FolderAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folderTokens: FolderTokenService,
  ) {}

  async requireFolder(
    folderId: string,
    userId: string,
    folderToken: string | null,
  ): Promise<Folder> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "This folder no longer exists.");
    }
    if (folder.passwordHash) {
      const ok = folderToken ? await this.folderTokens.verify(folder.id, folderToken) : false;
      if (!ok) {
        throw new AppError(
          ErrorCode.FOLDER_PROTECTED,
          "This folder is locked.",
        );
      }
    }
    return folder;
  }

  /** Same as requireFolder but also returns the folder when not protected
   *  (no token needed). Used for operations that always need the folder. */
  async loadOwned(folderId: string, userId: string): Promise<Folder> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "This folder no longer exists.");
    }
    return folder;
  }
}
