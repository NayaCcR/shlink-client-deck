"use client";

import type { HostedServer, HostedSession } from "@/lib/hosted/types";
import type { ShlinkHealth, ShlinkServer } from "@/lib/shlink/types";

type ApiEnvelope<T> = T & {
  error?: {
    code?: string;
    message?: string;
  };
};

type HostedSessionResponse = {
  enabled: boolean;
  session: HostedSession | null;
};

type HostedServersResponse = {
  workspaceId: string;
  servers: HostedServer[];
};

export type HostedConnectionTestResult = {
  health: ShlinkHealth;
  shortUrls: {
    ok: boolean;
    message: string;
  };
};

export type HostedServerInput = {
  workspaceId: string;
  name: string;
  baseUrl: string;
  apiKey: string;
};

export type HostedServerUpdateInput = {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
};

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers
    }
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.error?.message || `Request failed with ${response.status}`);
  }

  return payload as T;
}

export function toHostedShlinkServer(server: HostedServer): ShlinkServer {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    name: server.name,
    baseUrl: server.baseUrl,
    apiKeyPreview: server.apiKeyPreview,
    mode: "hosted",
    createdAt: server.createdAt,
    updatedAt: server.updatedAt
  };
}

export function getHostedSession() {
  return apiRequest<HostedSessionResponse>("/api/hosted/auth/session", {
    method: "GET"
  });
}

export function registerHostedAccount(input: {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
}) {
  return apiRequest<{ session: HostedSession }>("/api/hosted/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function loginHostedAccount(input: { email: string; password: string }) {
  return apiRequest<{ session: HostedSession }>("/api/hosted/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function logoutHostedAccount() {
  return apiRequest<{ ok: boolean }>("/api/hosted/auth/logout", {
    method: "POST"
  });
}

export function listHostedServers(workspaceId?: string) {
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  return apiRequest<HostedServersResponse>(`/api/hosted/servers${query}`, {
    method: "GET"
  });
}

export function createHostedServer(input: HostedServerInput) {
  return apiRequest<{ server: HostedServer }>("/api/hosted/servers", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateHostedServer(serverId: string, input: HostedServerUpdateInput) {
  return apiRequest<{ server: HostedServer }>(`/api/hosted/servers/${encodeURIComponent(serverId)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteHostedServer(serverId: string) {
  return apiRequest<{ ok: boolean }>(`/api/hosted/servers/${encodeURIComponent(serverId)}`, {
    method: "DELETE"
  });
}

export function testHostedServerConnection(input: {
  serverId?: string;
  baseUrl?: string;
  apiKey?: string;
}) {
  return apiRequest<HostedConnectionTestResult>("/api/hosted/servers/test", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
