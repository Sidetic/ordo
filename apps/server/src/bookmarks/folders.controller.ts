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
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  CreateFolderSchema,
  SetFolderPasswordSchema,
  UnlockFolderSchema,
  UpdateFolderSchema,
  type ExportFormat,
  type FolderDto,
} from "@ordo/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AuthGuard } from "../auth/auth.guard.js";
import {
  CurrentUser,
  type AuthContext,
  type AuthenticatedRequest,
} from "../common/decorators/current-user.decorator.js";
import { getFolderToken } from "../common/utils/request.js";
import { FoldersService } from "./folders.service.js";
import { FolderAccessService } from "./folder-access.service.js";

@UseGuards(AuthGuard)
@Controller("api/folders")
export class FoldersController {
  constructor(
    private readonly folders: FoldersService,
    private readonly access: FolderAccessService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthContext): Promise<FolderDto[]> {
    return this.folders.list(user.userId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateFolderSchema)) body: { name: string },
  ): Promise<FolderDto> {
    return this.folders.create(user.userId, body.name);
  }

  @Patch(":id")
  async rename(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateFolderSchema)) body: { name: string },
  ): Promise<FolderDto> {
    return this.folders.rename(id, user.userId, body.name);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
  ): Promise<{ success: true }> {
    await this.folders.remove(id, user.userId);
    return { success: true };
  }

  @Post(":id/password")
  @HttpCode(200)
  async setPassword(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SetFolderPasswordSchema)) body: { password: string },
  ): Promise<{ success: true }> {
    await this.folders.setPassword(id, user.userId, body.password);
    return { success: true };
  }

  @Delete(":id/password")
  @HttpCode(200)
  async removePassword(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
  ): Promise<{ success: true }> {
    await this.folders.removePassword(id, user.userId);
    return { success: true };
  }

  @Post(":id/unlock")
  @HttpCode(200)
  async unlock(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UnlockFolderSchema)) body: { password: string },
  ): Promise<{ token: string; expiresIn: number }> {
    return this.folders.unlock(id, user.userId, body.password);
  }

  @Get(":id/export")
  async export(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Query("format") format: ExportFormat | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const folder = await this.access.requireFolder(id, user.userId, getFolderToken(req));
    const fmt: ExportFormat = format === "html" ? "html" : "json";
    const { body, contentType } = await this.folders.export(folder, fmt);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(folder.name)}.${fmt === "html" ? "html" : "json"}"`,
    );
    res.send(body);
  }
}

export type { AuthenticatedRequest };
