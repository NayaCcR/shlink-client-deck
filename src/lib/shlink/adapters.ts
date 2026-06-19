import type { ShlinkClientCredentials, ShlinkServer } from "@/lib/shlink/types";

export type ShlinkRequestMode = "static" | "hosted";

export type ShlinkAdapterContext = {
  mode: ShlinkRequestMode;
  server: ShlinkServer;
};

export function staticCredentialsFromServer(server: ShlinkServer): ShlinkClientCredentials {
  return {
    baseUrl: server.baseUrl,
    apiKey: server.apiKey
  };
}

export function assertStaticMode(context: ShlinkAdapterContext) {
  if (context.mode !== "static") {
    throw new Error("Use the Hosted Mode Shlink proxy instead of static credentials.");
  }
}
