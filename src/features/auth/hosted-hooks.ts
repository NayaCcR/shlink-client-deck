"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changeHostedPassword,
  createHostedInvite,
  createHostedServer,
  deleteHostedServer,
  disableHostedInvite,
  getHostedSession,
  listHostedInvites,
  listHostedMembers,
  listHostedServers,
  loginHostedAccount,
  logoutHostedAccount,
  registerHostedAccount,
  removeHostedMember,
  testHostedServerConnection,
  toHostedShlinkServer,
  updateHostedMemberRole,
  updateHostedServer,
  type HostedInviteInput,
  type HostedPasswordChangeInput,
  type HostedServerInput,
  type HostedServerUpdateInput
} from "@/features/auth/hosted-api";
import { useServerStore } from "@/features/servers/server-store";
import { isHostedAppMode } from "@/lib/config/app-mode";
import type { HostedRole } from "@/lib/hosted/types";

export const hostedSessionKey = ["hosted", "session"] as const;
export const hostedServersKey = (workspaceId?: string | null) =>
  ["hosted", "servers", workspaceId ?? "default"] as const;
export const hostedInvitesKey = (workspaceId?: string | null) =>
  ["hosted", "invites", workspaceId ?? "default"] as const;
export const hostedMembersKey = (workspaceId?: string | null) =>
  ["hosted", "members", workspaceId ?? "default"] as const;

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

export function useHostedInvites(workspaceId?: string | null, enabled = true) {
  return useQuery({
    queryKey: hostedInvitesKey(workspaceId),
    queryFn: () => listHostedInvites(workspaceId ?? undefined),
    enabled: isHostedAppMode() && enabled && Boolean(workspaceId),
    staleTime: 30_000,
    retry: false
  });
}

export function useHostedMembers(workspaceId?: string | null, enabled = true) {
  return useQuery({
    queryKey: hostedMembersKey(workspaceId),
    queryFn: () => listHostedMembers(workspaceId ?? undefined),
    enabled: isHostedAppMode() && enabled && Boolean(workspaceId),
    staleTime: 30_000,
    retry: false
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

export function useCreateHostedInvite(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HostedInviteInput) => createHostedInvite(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedInvitesKey(workspaceId) });
    }
  });
}

export function useDisableHostedInvite(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableHostedInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedInvitesKey(workspaceId) });
    }
  });
}

export function useChangeHostedPassword() {
  return useMutation({
    mutationFn: (input: HostedPasswordChangeInput) => changeHostedPassword(input)
  });
}

export function useUpdateHostedMemberRole(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: HostedRole }) =>
      updateHostedMemberRole(memberId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedMembersKey(workspaceId) });
      await queryClient.invalidateQueries({ queryKey: hostedSessionKey });
    }
  });
}

export function useRemoveHostedMember(workspaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeHostedMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hostedMembersKey(workspaceId) });
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
