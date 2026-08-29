import { z } from "zod";
import {
  MAX_TAGS_PER_BOOKMARK,
  TAG_COLORS,
  TAG_NAME_MAX_LENGTH,
} from "../constants.js";

export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function tagNameKey(value: string): string {
  return normalizeTagName(value).toLocaleLowerCase("en-US");
}

export const TagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .pipe(
    z
      .string()
      .min(1, { message: "Enter a tag name." })
      .max(TAG_NAME_MAX_LENGTH, { message: `Tag names can be at most ${TAG_NAME_MAX_LENGTH} characters.` }),
  );

export const TagColorSchema = z.enum(TAG_COLORS);

export const CreateTagSchema = z.object({
  name: TagNameSchema,
  color: TagColorSchema,
});
export type CreateTagInput = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z
  .object({
    name: TagNameSchema.optional(),
    color: TagColorSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.color !== undefined, {
    message: "Provide at least one field to update.",
  });
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;

const uniqueTagIds = z
  .array(z.string().min(1))
  .max(MAX_TAGS_PER_BOOKMARK, {
    message: `A bookmark can have at most ${MAX_TAGS_PER_BOOKMARK} tags.`,
  })
  .refine((ids) => new Set(ids).size === ids.length, { message: "Tag IDs must be unique." });

export const UpdateBookmarkTagsSchema = z.object({
  tagIds: uniqueTagIds,
  dismissedSuggestionIds: z.array(z.string().min(1)).max(MAX_TAGS_PER_BOOKMARK).default([]),
});
export type UpdateBookmarkTagsInput = z.infer<typeof UpdateBookmarkTagsSchema>;
