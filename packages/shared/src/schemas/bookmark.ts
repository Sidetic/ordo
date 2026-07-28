import { z } from "zod";

const url = z
  .string()
  .trim()
  .min(1, { message: "URL is required" })
  .url({ message: "Enter a valid URL" })
  .max(2048);

export const CreateBookmarkSchema = z.object({
  url,
  folderId: z.string().min(1),
});
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;

export const UpdateBookmarkSchema = z
  .object({
    folderId: z.string().min(1).optional(),
    isRead: z.boolean().optional(),
  })
  .refine((v) => v.folderId !== undefined || v.isRead !== undefined, {
    message: "Provide at least one field to update",
  });
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;

export const MarkAllReadSchema = z.object({
  folderId: z.string().min(1),
});
export type MarkAllReadInput = z.infer<typeof MarkAllReadSchema>;
