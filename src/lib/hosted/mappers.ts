import type {
  HostedServer,
  HostedServerRecord,
  HostedSiteServer,
  HostedSiteUser,
  HostedWorkspaceMember,
  HostedWorkspaceMemberRecord,
  HostedWorkspaceInvite,
  HostedWorkspaceInviteRecord,
  HostedWorkspaceRecord,
  HostedUserRecord
} from "@/lib/hosted/types";

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

export function toPublicHostedInvite(invite: HostedWorkspaceInviteRecord): HostedWorkspaceInvite {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    createdByUserId: invite.createdByUserId,
    role: invite.role,
    codePreview: invite.codePreview,
    maxUses: invite.maxUses,
    uses: invite.uses,
    expiresAt: invite.expiresAt,
    disabledAt: invite.disabledAt,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt
  };
}

export function toPublicHostedMember(input: {
  member: HostedWorkspaceMemberRecord;
  user: HostedUserRecord;
}): HostedWorkspaceMember {
  return {
    id: input.member.id,
    userId: input.user.id,
    workspaceId: input.member.workspaceId,
    name: input.user.name,
    email: input.user.email,
    role: input.member.role,
    createdAt: input.member.createdAt
  };
}

export function toPublicHostedSiteUser(input: {
  user: HostedUserRecord;
  workspaceCount: number;
}): HostedSiteUser {
  return {
    id: input.user.id,
    name: input.user.name,
    email: input.user.email,
    siteRole: input.user.siteRole,
    workspaceCount: input.workspaceCount,
    createdAt: input.user.createdAt,
    updatedAt: input.user.updatedAt,
    mustChangeProfile: input.user.mustChangeProfile
  };
}

export function toPublicHostedSiteServer(input: {
  server: HostedServerRecord;
  workspace: HostedWorkspaceRecord | null;
}): HostedSiteServer {
  return {
    id: input.server.id,
    workspaceId: input.server.workspaceId,
    workspaceName: input.workspace?.name ?? "Unknown workspace",
    name: input.server.name,
    baseUrl: input.server.baseUrl,
    apiKeyPreview: input.server.apiKeyPreview,
    createdAt: input.server.createdAt,
    updatedAt: input.server.updatedAt
  };
}
