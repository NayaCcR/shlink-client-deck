import { z } from "zod";
import type { TFunction } from "i18next";

export function createShortUrlFormSchema(t: TFunction<"common">) {
  return z
    .object({
      longUrl: z.string().trim().url(t("validation.longUrlInvalid")),
      customSlug: z.string().trim().optional(),
      title: z.string().trim().optional(),
      tagsText: z.string().optional(),
      validSince: z.string().optional(),
      validUntil: z.string().optional(),
      domain: z.string().trim().optional(),
      protectedEnabled: z.boolean().optional(),
      protectedPassword: z.string().optional()
    })
    .superRefine((value, context) => {
      if (!value.protectedEnabled) {
        return;
      }

      const password = value.protectedPassword?.trim() ?? "";
      if (password.length < 4 || password.length > 200) {
        context.addIssue({
          code: "custom",
          path: ["protectedPassword"],
          message: t("validation.protectedPasswordInvalid")
        });
      }
    });
}

export const shortUrlFormSchema = z
  .object({
    longUrl: z.string().trim().url("Enter a valid long URL"),
    customSlug: z.string().trim().optional(),
    title: z.string().trim().optional(),
    tagsText: z.string().optional(),
    validSince: z.string().optional(),
    validUntil: z.string().optional(),
    domain: z.string().trim().optional(),
    protectedEnabled: z.boolean().optional(),
    protectedPassword: z.string().optional()
  })
  .superRefine((value, context) => {
    if (!value.protectedEnabled) {
      return;
    }

    const password = value.protectedPassword?.trim() ?? "";
    if (password.length < 4 || password.length > 200) {
      context.addIssue({
        code: "custom",
        path: ["protectedPassword"],
        message: "Enter a password between 4 and 200 characters"
      });
    }
  });

export type ShortUrlFormValues = z.infer<typeof shortUrlFormSchema>;

export function parseTagsText(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
