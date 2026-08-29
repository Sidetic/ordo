import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CreateFolderSchema,
  RemoveFolderPasswordSchema,
  SetFolderPasswordSchema,
  UnlockFolderSchema,
  UpdateFolderSchema,
  type CreateFolderInput,
  type FolderDto,
  type RemoveFolderPasswordInput,
  type SetFolderPasswordInput,
  type UpdateFolderInput,
} from "@ordo/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator.js";
import { AuthGuard } from "../auth/auth.guard.js";
import {
  CurrentUser,
  type AuthContext,
  type AuthenticatedRequest,
} from "../common/decorators/current-user.decorator.js";
import { FoldersService } from "./folders.service.js";

@UseGuards(AuthGuard)
@Controller("api/folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  async list(@CurrentUser() user: AuthContext): Promise<FolderDto[]> {
    return this.folders.list(user.userId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateFolderSchema)) body: CreateFolderInput,
  ): Promise<FolderDto> {
    return this.folders.create(user.userId, body);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateFolderSchema)) body: UpdateFolderInput,
  ): Promise<FolderDto> {
    return this.folders.update(id, user.userId, body);
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
    @Body(new ZodValidationPipe(SetFolderPasswordSchema)) body: SetFolderPasswordInput,
  ): Promise<{ success: true }> {
    await this.folders.setPassword(id, user.userId, body);
    return { success: true };
  }

  @Delete(":id/password")
  @RateLimit("folder-unlock")
  @HttpCode(200)
  async removePassword(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RemoveFolderPasswordSchema)) body: RemoveFolderPasswordInput,
  ): Promise<{ success: true }> {
    await this.folders.removePassword(id, user.userId, body);
    return { success: true };
  }

  @Post(":id/unlock")
  @RateLimit("folder-unlock")
  @HttpCode(200)
  async unlock(
    @CurrentUser() user: AuthContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UnlockFolderSchema)) body: { password: string },
  ): Promise<{ token: string; expiresIn: number }> {
    return this.folders.unlock(id, user.userId, body.password);
  }
}

export type { AuthenticatedRequest };
