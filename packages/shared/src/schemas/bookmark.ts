import { z } from "zod";

const url = z
  .string()
  .trim()
  .min(1, { message: "URL is required" })
  .url({ message: "Enter a valid URL" })
  .max(2048);

/**
 * Target folder for a bookmark. Omitted or `null` means the bookmark is
 * "unfiled" (it lives outside every folder).
 */
const folderId = z.string().min(1, { message: "Folder is required" }).nullish();

export const CreateBookmarkSchema = z.object({
  url,
  folderId,
});
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;

export const UpdateBookmarkSchema = z
  .object({
    /** Passing `null` moves the bookmark to unfiled. */
    folderId: folderId.optional(),
    isRead: z.boolean().optional(),
  })
  .refine((v) => v.folderId !== undefined || v.isRead !== undefined, {
    message: "Provide at least one field to update",
  });
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;

/** Without a `folderId` (or with `null`), only unfiled bookmarks are marked read. */
export const MarkAllReadSchema = z.object({
  folderId,
});
export type MarkAllReadInput = z.infer<typeof MarkAllReadSchema>;
