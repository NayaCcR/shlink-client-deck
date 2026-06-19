"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createHostedServer,
  deleteHostedServer,
  getHostedSession,
  listHostedServers,
  loginHostedAccount,
  logoutHostedAccount,
  registerHostedAccount,
  testHostedServerConnection,
  toHostedShlinkServer,
  updateHostedServer,
  type HostedServerInput,
  type HostedServerUpdateInput
} from "@/features/auth/hosted-api";
import { useServerStore } from "@/features/servers/server-store";
import { isHostedAppMode } from "@/lib/config/app-mode";

export const hostedSessionKey = ["hosted", "session"] as const;
export const hostedServersKey = (workspaceId?: string | null) =>
  ["hosted", "servers", workspaceId ?? "default"] as const;

export function useHostedSession() {
  return useQuery({
    queryKey: hostedSessionKey,
    queryFn: getHostedSession,
    enabled: isHostedAppMode(),
    staleTime: 30_000
  });
}

export function useHostedServers(workspaceId?: string | null) {
  return useQuery({
    queryKey: hostedServersKey(workspaceId),
    queryFn: async () => {
      const result = await listHostedServers(workspaceId ?? undefined);
      return {
        ...result,
        servers: result.servers.map(toHostedShlinkServer)
      };
    },
    enabled: isHostedAppMode() && Boolean(workspaceId),
    staleTime: 30_000
  });
}

export function useHostedLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginHostedAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedSessionKey });
    }
  });
}

export function useHostedRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerHostedAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedSessionKey });
    }
  });
}

export function useHostedLogout() {
  const queryClient = useQueryClient();
  const clearServers = useServerStore((state) => state.clearServers);

  return useMutation({
    mutationFn: logoutHostedAccount,
    onSuccess: async () => {
      clearServers();
      queryClient.setQueryData(hostedSessionKey, {
        enabled: true,
        session: null
      });
      await queryClient.invalidateQueries({ queryKey: hostedSessionKey });
    }
  });
}

export function useCreateHostedServer(workspaceId?: string | null) {
  const queryClient = useQueryClient();
  const setCurrentServerId = useServerStore((state) => state.setCurrentServerId);

  return useMutation({
    mutationFn: (input: HostedServerInput) => createHostedServer(input),
    onSuccess: async (result) => {
      setCurrentServerId(result.server.id);
      await queryClient.invalidateQueries({ queryKey: hostedServersKey(workspaceId) });
    }
  });
}

export function useUpdateHostedServer(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverId, input }: { serverId: string; input: HostedServerUpdateInput }) =>
      updateHostedServer(serverId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedServersKey(workspaceId) });
    }
  });
}

export function useDeleteHostedServer(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHostedServer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedServersKey(workspaceId) });
    }
  });
}

export function useTestHostedServerConnection() {
  return useMutation({
    mutationFn: testHostedServerConnection
  });
}
