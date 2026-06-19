import { z } from "zod";
import type { TFunction } from "i18next";

export function createServerFormSchema(
  t: TFunction<"common">,
  options: { apiKeyOptional?: boolean } = {}
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.serverNameRequired"))
      .max(60, t("validation.serverNameTooLong")),
    baseUrl: z
      .string()
      .trim()
      .url(t("validation.baseUrlInvalid"))
      .refine((value) => /^https?:\/\//i.test(value), t("validation.baseUrlProtocol")),
    apiKey: options.apiKeyOptional
      ? z.string().trim()
      : z.string().trim().min(1, t("validation.apiKeyRequired"))
  });
}

export const serverFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a server name").max(60, "Name is too long"),
  baseUrl: z
    .string()
    .trim()
    .url("Enter a valid URL, for example https://u.example.com")
    .refine((value) => /^https?:\/\//i.test(value), "API URL must start with http:// or https://"),
  apiKey: z.string().trim().min(1, "Enter an API key")
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;
