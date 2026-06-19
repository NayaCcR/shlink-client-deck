"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ShlinkServer } from "@/lib/shlink/types";
import { maskSecret, normalizeBaseUrl } from "@/lib/utils";

type ServerState = {
  servers: ShlinkServer[];
  currentServerId: string | null;
  hydrated: boolean;
  addServer: (input: Omit<ShlinkServer, "id" | "createdAt" | "updatedAt">) => ShlinkServer;
  updateServer: (id: string, input: Partial<Omit<ShlinkServer, "id" | "createdAt">>) => void;
  deleteServer: (id: string) => void;
  setCurrentServerId: (id: string | null) => void;
  syncHostedServers: (servers: ShlinkServer[]) => void;
  importServers: (servers: ShlinkServer[], currentServerId?: string | null) => void;
  clearServers: () => void;
  markHydrated: () => void;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `srv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function touch(server: ShlinkServer): ShlinkServer {
  return {
    ...server,
    baseUrl: normalizeBaseUrl(server.baseUrl),
    updatedAt: new Date().toISOString()
  };
}

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      servers: [],
      currentServerId: null,
      hydrated: false,
      addServer: (input) => {
        const now = new Date().toISOString();
        const server: ShlinkServer = {
          id: newId(),
          name: input.name.trim(),
          baseUrl: normalizeBaseUrl(input.baseUrl),
          apiKey: input.apiKey?.trim() ?? "",
          apiKeyPreview: input.apiKeyPreview,
          workspaceId: input.workspaceId,
          mode: input.mode ?? "static",
          createdAt: now,
          updatedAt: now
        };

        set((state) => ({
          servers: [...state.servers, server],
          currentServerId: state.currentServerId ?? server.id
        }));

        return server;
      },
      updateServer: (id, input) => {
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id
              ? touch({
                  ...server,
                  ...input,
                  name: input.name?.trim() ?? server.name,
                  apiKey: input.apiKey?.trim() ?? server.apiKey,
                  apiKeyPreview: input.apiKeyPreview ?? server.apiKeyPreview
                })
              : server
          )
        }));
      },
      deleteServer: (id) => {
        const remaining = get().servers.filter((server) => server.id !== id);
        const currentServerId =
          get().currentServerId === id ? remaining[0]?.id ?? null : get().currentServerId;
        set({
          servers: remaining,
          currentServerId
        });
      },
      setCurrentServerId: (id) => set({ currentServerId: id }),
      syncHostedServers: (servers) => {
        const normalized = servers.map(
          (server): ShlinkServer => ({
            ...server,
            baseUrl: normalizeBaseUrl(server.baseUrl),
            mode: "hosted",
            apiKey: undefined,
            createdAt: server.createdAt || new Date().toISOString(),
            updatedAt: server.updatedAt || new Date().toISOString()
          })
        );
        const currentServerId = get().currentServerId;
        set({
          servers: normalized,
          currentServerId: normalized.some((server) => server.id === currentServerId)
            ? currentServerId
            : normalized[0]?.id ?? null,
          hydrated: true
        });
      },
      importServers: (servers, currentServerId) => {
        const normalized = servers.map((server) =>
          touch({
            ...server,
            id: server.id || newId(),
            mode: server.mode ?? "static",
            createdAt: server.createdAt || new Date().toISOString()
          })
        );

        set({
          servers: normalized,
          currentServerId: currentServerId ?? normalized[0]?.id ?? null
        });
      },
      clearServers: () => set({ servers: [], currentServerId: null }),
      markHydrated: () => set({ hydrated: true })
    }),
    {
      name: "link-console-servers",
      partialize: (state) => ({
        servers: state.servers,
        currentServerId: state.currentServerId
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated()
    }
  )
);

export function useCurrentServer() {
  return useServerStore((state) =>
    state.servers.find((server) => server.id === state.currentServerId) ?? null
  );
}

export function toPublicServer(server: ShlinkServer) {
  return {
    ...server,
    apiKey: undefined,
    apiKeyPreview: server.apiKeyPreview ?? maskSecret(server.apiKey)
  };
}
