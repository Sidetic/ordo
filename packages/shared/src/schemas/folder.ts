import { z } from "zod";
import { FOLDER_ICONS } from "../constants.js";

const name = z
  .string()
  .trim()
  .min(1, { message: "Enter a folder name." })
  .max(100, { message: "Name is too long." });

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
    message: "Provide at least one field to update.",
  });
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;

export const SetFolderPasswordSchema = z.object({
  password: z.string().min(4, { message: "Use at least 4 characters." }).max(256),
});
export type SetFolderPasswordInput = z.infer<typeof SetFolderPasswordSchema>;

export const UnlockFolderSchema = z.object({
  password: z.string().min(1, { message: "Enter the folder password." }),
});
export type UnlockFolderInput = z.infer<typeof UnlockFolderSchema>;

/** Remove a folder lock with either the folder password or the account password. */
export const RemoveFolderPasswordSchema = z
  .object({
    folderPassword: z.string().min(1, { message: "Enter the folder password." }).max(256).optional(),
    accountPassword: z.string().min(1, { message: "Enter your account password." }).max(256).optional(),
  })
  .refine((data) => Boolean(data.folderPassword) !== Boolean(data.accountPassword), {
    message: "Enter the folder password or your account password.",
  });
export type RemoveFolderPasswordInput = z.infer<typeof RemoveFolderPasswordSchema>;
