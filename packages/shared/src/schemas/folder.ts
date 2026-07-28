import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name is too long" });

export const CreateFolderSchema = z.object({ name });
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;

export const UpdateFolderSchema = z.object({ name });
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;

export const SetFolderPasswordSchema = z.object({
  password: z.string().min(4, { message: "Folder password is too short" }).max(256),
});
export type SetFolderPasswordInput = z.infer<typeof SetFolderPasswordSchema>;

export const UnlockFolderSchema = z.object({
  password: z.string().min(1),
});
export type UnlockFolderInput = z.infer<typeof UnlockFolderSchema>;
