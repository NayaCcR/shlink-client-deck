import { z } from "zod";

export const runtimeConfigSchema = z.object({
  appName: z.string().default("Link Console"),
  defaultLocale: z.string().default("zh-CN"),
  allowStaticMode: z.boolean().default(true),
  allowHostedMode: z.boolean().default(false),
  hostedModeUrl: z.string().url().nullable().default(null),
  demoServer: z
    .object({
      name: z.string(),
      baseUrl: z.string().url(),
      apiKey: z.string().optional()
    })
    .nullable()
    .default(null),
  officialSite: z.string().url().optional()
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export const fallbackRuntimeConfig: RuntimeConfig = {
  appName: "Link Console",
  defaultLocale: "zh-CN",
  allowStaticMode: true,
  allowHostedMode: false,
  hostedModeUrl: null,
  demoServer: null,
  officialSite: "https://link.31n.cc"
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (typeof window === "undefined") {
    return fallbackRuntimeConfig;
  }

  try {
    const response = await fetch("/config.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackRuntimeConfig;
    }

    const payload = await response.json();
    return runtimeConfigSchema.parse(payload);
  } catch {
    return fallbackRuntimeConfig;
  }
}
