import type {
  HostedServer,
  HostedServerRecord,
  HostedWorkspaceMember,
  HostedWorkspaceMemberRecord,
  HostedWorkspaceInvite,
  HostedWorkspaceInviteRecord,
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
