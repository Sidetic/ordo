import { z } from "zod";
import { FOLDER_ICONS } from "../constants.js";

const name = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name is too long" });

/** Valid folder icons (curated Ionicons outline names). */
export const FolderIconSchema = z.enum(FOLDER_ICONS);

export const CreateFolderSchema = z.object({
  name,
  icon: FolderIconSchema.optional(),
});
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;

export const UpdateFolderSchema = z
  .object({
    name: name.optional(),
    icon: FolderIconSchema.optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.icon !== undefined || data.pinned !== undefined, {
    message: "At least one of name, icon, or pinned is required",
  });
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;

export const SetFolderPasswordSchema = z.object({
  password: z.string().min(4, { message: "Folder password is too short" }).max(256),
});
export type SetFolderPasswordInput = z.infer<typeof SetFolderPasswordSchema>;

export const UnlockFolderSchema = z.object({
  password: z.string().min(1),
});
export type UnlockFolderInput = z.infer<typeof UnlockFolderSchema>;
