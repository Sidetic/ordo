import { Injectable } from "@nestjs/common";
import type { Folder } from "@prisma/client";
import { DEFAULT_FOLDER_NAME, ErrorCode, type FolderDto } from "@ordo/shared";
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
      orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
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

  async create(userId: string, name: string): Promise<FolderDto> {
    const maxPosition = await this.prisma.folder.aggregate({
      where: { userId },
      _max: { position: true },
    });
    const folder = await this.prisma.folder.create({
      data: { userId, name, position: (maxPosition._max.position ?? -1) + 1 },
    });
    return toFolderDto(folder, { bookmarkCount: 0, unreadCount: 0 });
  }

  async rename(folderId: string, userId: string, name: string): Promise<FolderDto> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "Folder not found");
    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });
    return toFolderDto(updated, { bookmarkCount: 0, unreadCount: 0 });
  }

  async remove(folderId: string, userId: string): Promise<void> {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) throw new AppError(ErrorCode.FOLDER_NOT_FOUND, "Folder not found");
    if (folder.isDefault) {
      throw new AppError(ErrorCode.DEFAULT_FOLDER_IMMUTABLE, "The default folder cannot be deleted");
    }
    const count = await this.prisma.bookmark.count({ where: { folderId } });
    if (count > 0) {
      throw new AppError(
        ErrorCode.FOLDER_NOT_EMPTY,
        "Move or delete the bookmarks in this folder first",
      );
    }
    await this.prisma.folder.delete({ where: { id: folderId } });
  }

  async setPassword(folderId: string, userId: string, password: string): Promise<void> {
    await this.access.loadOwned(folderId, userId);
    await this.folderTokens.setPassword(folderId, password);
  }

  async removePassword(folderId: string, userId: string): Promise<void> {
    await this.access.loadOwned(folderId, userId);
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

  async export(
    folder: Folder,
    format: "json" | "html",
  ): Promise<{ body: string; contentType: string }> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { folderId: folder.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        domain: true,
        contentMarkdown: true,
        createdAt: true,
      },
    });

    if (format === "json") {
      return {
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(
          {
            folder: folder.name,
            exportedAt: new Date().toISOString(),
            bookmarks: bookmarks.map((b) => ({
              ...b,
              createdAt: b.createdAt.toISOString(),
            })),
          },
          null,
          2,
        ),
      };
    }

    const items = bookmarks
      .map(
        (b) =>
          `        <DT><A HREF="${this.escapeHtml(b.url)}" ADD_DATE="${Math.floor(
            b.createdAt.getTime() / 1000,
          )}">${this.escapeHtml(b.title)}</A>`,
      )
      .join("\n");
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>${this.escapeHtml(folder.name)}</H1>
<DL><p>
${items}
    </DL><p>`;
    return { contentType: "text/html; charset=utf-8", body: html };
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

export { DEFAULT_FOLDER_NAME };
