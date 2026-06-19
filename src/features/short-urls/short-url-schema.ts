import { z } from "zod";
import type { TFunction } from "i18next";

export function createShortUrlFormSchema(t: TFunction<"common">) {
  return z.object({
    longUrl: z.string().trim().url(t("validation.longUrlInvalid")),
    customSlug: z.string().trim().optional(),
    title: z.string().trim().optional(),
    tagsText: z.string().optional(),
    validSince: z.string().optional(),
    validUntil: z.string().optional(),
    domain: z.string().trim().optional()
  });
}

export const shortUrlFormSchema = z.object({
  longUrl: z.string().trim().url("Enter a valid long URL"),
  customSlug: z.string().trim().optional(),
  title: z.string().trim().optional(),
  tagsText: z.string().optional(),
  validSince: z.string().optional(),
  validUntil: z.string().optional(),
  domain: z.string().trim().optional()
});

export type ShortUrlFormValues = z.infer<typeof shortUrlFormSchema>;

export function parseTagsText(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
