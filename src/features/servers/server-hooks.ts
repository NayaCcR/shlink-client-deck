"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { testHostedServerConnection } from "@/features/auth/hosted-api";
import { isHostedAppMode } from "@/lib/config/app-mode";
import { createShlinkClient } from "@/lib/shlink/client";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";

type ConnectionTestInput = Pick<ShlinkServer, "baseUrl"> & {
  apiKey?: string;
  serverId?: string;
};

export function useServerHealth(server: ShlinkServer | null) {
  return useQuery({
    queryKey: ["shlink", server?.id, "health"],
    queryFn: () => createShlinkClient(server!).health(),
    enabled: Boolean(server),
    staleTime: 60_000
  });
}

export function useTestServerConnection() {
  return useMutation({
    mutationFn: async (server: ConnectionTestInput) => {
      if (isHostedAppMode()) {
        return testHostedServerConnection({
          serverId: server.serverId,
          baseUrl: server.baseUrl,
          apiKey: server.apiKey
        });
      }

      const client = createShlinkClient(server);
      const health = await client.health();
      const shortUrls = await client
        .listShortUrls({
          page: 1,
          itemsPerPage: 1
        })
        .then(() => ({
          ok: true,
          message: "servers.connectionAccessible"
        }))
        .catch((error: unknown) => ({
          ok: false,
          message: getShlinkErrorMessage(error)
        }));

      return {
        health,
        shortUrls
      };
    }
  });
}

export function useTestSavedServerConnection() {
  return useMutation({
    mutationFn: async (server: ShlinkServer) => {
      const client = createShlinkClient(server);
      const health = await client.health();
      const shortUrls = await client
        .listShortUrls({
          page: 1,
          itemsPerPage: 1
        })
        .then(() => ({
          ok: true,
          message: "servers.connectionAccessible"
        }))
        .catch((error: unknown) => ({
          ok: false,
          message: getShlinkErrorMessage(error)
        }));

      return {
        health,
        shortUrls
      };
    }
  });
}
