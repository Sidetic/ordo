import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateBookmarkSchema,
  MarkAllReadSchema,
  UpdateBookmarkSchema,
  type BookmarkDto,
  type CursorPage,
} from "@ordo/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AuthGuard } from "../auth/auth.guard.js";
import {
  CurrentUser,
  type AuthContext,
} from "../common/decorators/current-user.decorator.js";
import { getFolderToken } from "../common/utils/request.js";
import { BookmarksService } from "./bookmarks.service.js";
import { FolderAccessService } from "./folder-access.service.js";

@UseGuards(AuthGuard)
@Controller("api/bookmarks")
export class BookmarksController {
  constructor(
    private readonly bookmarks: BookmarksService,
    private readonly access: FolderAccessService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateBookmarkSchema)) body: { url: string; folderId?: string | null },
    @Req() req: Request,
  ): Promise<BookmarkDto> {
    // A missing/null folderId stores the bookmark as unfiled.
    const folder = body.folderId
      ? await this.access.requireFolder(body.folderId, user.userId, getFolderToken(req))
      : null;
    return this.bookmarks.create(user.userId, folder, body.url);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthContext,
    @Query("folderId") folderId: string | undefined,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() req: Request,
  ): Promise<CursorPage<BookmarkDto>> {
    // Without a folderId only the user's unfiled bookmarks are listed.
    const folder = folderId
      ? await this.access.requireFolder(folderId, user.userId, getFolderToken(req))
      : null;
    return this.bookmarks.list(user.userId, folder, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("search")
  async search(
    @CurrentUser() user: AuthContext,
    @Query("q") q: string,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
  ): Promise<CursorPage<BookmarkDto>> {
    return this.bookmarks.search(user.userId, q ?? "", {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  async detail(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<BookmarkDto & { contentHtml: string | null }> {
    return this.bookmarks.detail(user.userId, id, getFolderToken(req));
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateBookmarkSchema)) body: {
      folderId?: string | null;
      isRead?: boolean;
      readProgress?: number;
    },
    @Req() req: Request,
  ): Promise<BookmarkDto> {
    return this.bookmarks.update(user.userId, id, body, getFolderToken(req));
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    await this.bookmarks.remove(user.userId, id, getFolderToken(req));
    return { success: true };
  }

  @Post("mark-all-read")
  @HttpCode(200)
  async markAllRead(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(MarkAllReadSchema)) body: { folderId?: string | null },
    @Req() req: Request,
  ): Promise<{ updated: number }> {
    // Without a folderId (or with null) only unfiled bookmarks are targeted.
    const folder = body.folderId
      ? await this.access.requireFolder(body.folderId, user.userId, getFolderToken(req))
      : null;
    const updated = await this.bookmarks.markAllRead(user.userId, folder);
    return { updated };
  }
}
