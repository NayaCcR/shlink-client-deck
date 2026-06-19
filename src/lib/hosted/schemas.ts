import { z } from "zod";

export const hostedRegisterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  workspaceName: z.string().trim().max(80).optional()
});

export const hostedLoginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200)
});

export const hostedServerCreateSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  baseUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value)),
  apiKey: z.string().trim().min(1)
});

export const hostedServerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  baseUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value))
    .optional(),
  apiKey: z.string().trim().min(1).optional()
});

export const hostedServerTestSchema = z
  .object({
    serverId: z.string().trim().min(1).optional(),
    baseUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => /^https?:\/\//i.test(value))
      .optional(),
    apiKey: z.string().trim().min(1).optional()
  })
  .superRefine((value, context) => {
    if (!value.serverId && (!value.baseUrl || !value.apiKey)) {
      context.addIssue({
        code: "custom",
        path: ["apiKey"],
        message: "API key is required when testing an unsaved server."
      });
    }
  });
