import type { HostedRole, HostedShortUrlRecord } from "@/lib/hosted/types";

const ROLE_RANK: Record<HostedRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3
};

export function roleCanSeeWorkspaceOverview(role: HostedRole) {
  return role === "owner" || role === "admin";
}

export function roleCanManageInvites(role: HostedRole) {
  return role === "owner" || role === "admin";
}

export function roleCanManageMembers(role: HostedRole) {
  return role === "owner" || role === "admin";
}

export function roleCanInviteRole(actorRole: HostedRole, invitedRole: HostedRole) {
  if (!roleCanManageInvites(actorRole) || invitedRole === "owner") {
    return false;
  }

  return ROLE_RANK[actorRole] > ROLE_RANK[invitedRole];
}

export function roleCanManageMemberRole(actorRole: HostedRole, targetRole: HostedRole) {
  if (!roleCanManageMembers(actorRole)) {
    return false;
  }

  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export function roleCanAssignMemberRole(actorRole: HostedRole, targetRole: HostedRole) {
  if (!roleCanManageMembers(actorRole)) {
    return false;
  }

  if (targetRole === "owner") {
    return actorRole === "owner";
  }

  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export function roleCanCreateShortUrls(role: HostedRole) {
  return role === "owner" || role === "admin" || role === "member";
}

export function roleCanManageServers(role: HostedRole) {
  return role === "owner" || role === "admin";
}

export function roleCanManageShortUrl(
  role: HostedRole,
  record: HostedShortUrlRecord | null,
  userId: string
) {
  if (roleCanSeeWorkspaceOverview(role)) {
    return true;
  }

  return role === "member" && record?.ownerUserId === userId;
}

export function canReadShortUrlRecord(record: HostedShortUrlRecord, userId: string) {
  return record.ownerUserId === userId || record.visibility === "workspace";
}
