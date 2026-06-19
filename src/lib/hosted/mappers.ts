import type { HostedServer, HostedServerRecord } from "@/lib/hosted/types";

export function toPublicHostedServer(server: HostedServerRecord): HostedServer {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    name: server.name,
    baseUrl: server.baseUrl,
    apiKeyPreview: server.apiKeyPreview,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt
  };
}
