import { z } from "zod";

const url = z
  .string()
  .trim()
  .min(1, { message: "Enter a URL." })
  .url({ message: "Enter a valid URL." })
  .max(2048);

/**
 * Target folder for a bookmark. Omitted or `null` means the bookmark is
 * "unfiled" (it lives outside every folder).
 */
const folderId = z.string().min(1, { message: "Choose a folder." }).nullish();

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
    /** Reading position within the article, 0..1 (>= 0.98 completes it). */
    readProgress: z
      .number()
      .min(0, { message: "Reading progress must be between 0 and 1." })
      .max(1, { message: "Reading progress must be between 0 and 1." })
      .optional(),
  })
  .refine(
    (v) => v.folderId !== undefined || v.isRead !== undefined || v.readProgress !== undefined,
    {
      message: "Provide at least one field to update.",
    },
  );
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;

/** Without a `folderId` (or with `null`), only unfiled bookmarks are marked read. */
export const MarkAllReadSchema = z.object({
  folderId,
});
export type MarkAllReadInput = z.infer<typeof MarkAllReadSchema>;
