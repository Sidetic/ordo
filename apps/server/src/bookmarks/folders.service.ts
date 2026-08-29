import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type {
  CreateFolderInput,
  FolderDto,
  RemoveFolderPasswordInput,
  UpdateFolderInput,
} from "@ordo/shared";
import { ErrorCode } from "@ordo/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { AppError } from "../common/errors/app-error.js";
import { FolderTokenService } from "./folder-token.service.js";
import { FolderAccessService } from "./folder-access.service.js";
import { toFolderDto } from "../common/mappers.js";

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folderTokens: FolderTokenService,
    private readonly access: FolderAccessService,
  ) {}

  async list(userId: string): Promise<FolderDto[]> {
    const folders = await this.prisma.folder.findMany({
      where: { userId },
      // pinned folders first, then manual position, then creation order
      orderBy: [
        { pinned: "desc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
      include: { _count: { select: { bookmarks: true } } },
    });

    const unreadGroups = await this.prisma.bookmark.groupBy({
      by: ["folderId"],
      where: { userId, isRead: false },
      _count: { _all: true },
    });
    const unreadByFolder = new Map(
      unreadGroups.map((g) => [g.folderId, g._count._all] as const),
    );

    return folders.map((f) =>
      toFolderDto(f, {
        bookmarkCount: f._count.bookmarks,
        unreadCount: unreadByFolder.get(f.id) ?? 0,
      }),
    );
  }

  async create(userId: string, input: CreateFolderInput): Promise<FolderDto> {
    const maxPosition = await this.prisma.folder.aggregate({
      where: { userId },
      _max: { position: true },
    });
    const folder = await this.prisma.folder.create({
      data: {
        userId,
        name: input.name,
        // undefined falls back to the schema default (folder-outline)
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });
    return toFolderDto(folder, { bookmarkCount: 0, unreadCount: 0 });
  }

  /** Partial metadata update: name, icon, and/or pinned. */
  async update(folderId: string, userId: string, input: UpdateFolderInput): Promise<FolderDto> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "This folder no longer exists.");

    const data: { name?: string; icon?: string; pinned?: boolean } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.pinned !== undefined) data.pinned = input.pinned;

    const updated = await this.prisma.folder.update({ where: { id: folderId }, data });
    return toFolderDto(updated, await this.folderCounts(folderId));
  }

  /** Any folder may be deleted. Bookmarks inside are removed by the schema's
   *  cascading delete. */
  async remove(folderId: string, userId: string): Promise<void> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "This folder no longer exists.");
    await this.prisma.folder.delete({ where: { id: folderId } });
  }

  async setPassword(folderId: string, userId: string, password: string): Promise<void> {
    await this.access.loadOwned(folderId, userId);
    await this.folderTokens.setPassword(folderId, password);
  }

  async removePassword(
    folderId: string,
    userId: string,
    input: RemoveFolderPasswordInput,
  ): Promise<void> {
    const folder = await this.access.loadOwned(folderId, userId);
    if (!folder.passwordHash) {
      throw new AppError(ErrorCode.FORBIDDEN, "This folder is not locked.");
    }
    if (input.folderPassword) {
      await this.folderTokens.assertPassword(folder, input.folderPassword);
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, "Account not found.");
      const ok = await bcrypt.compare(input.accountPassword ?? "", user.passwordHash);
      if (!ok) {
        throw new AppError(ErrorCode.INVALID_CREDENTIALS, "Incorrect password.");
      }
    }
    await this.folderTokens.removePassword(folderId);
  }

  async unlock(
    folderId: string,
    userId: string,
    password: string,
  ): Promise<{ token: string; expiresIn: number }> {
    const folder = await this.access.loadOwned(folderId, userId);
    return this.folderTokens.unlock(folder, password);
  }

  /** Live bookmark counts for a single folder. */
  private async folderCounts(
    folderId: string,
  ): Promise<{ bookmarkCount: number; unreadCount: number }> {
    const [bookmarkCount, unreadCount] = await this.prisma.$transaction([
      this.prisma.bookmark.count({ where: { folderId } }),
      this.prisma.bookmark.count({ where: { folderId, isRead: false } }),
    ]);
    return { bookmarkCount, unreadCount };
  }
}
