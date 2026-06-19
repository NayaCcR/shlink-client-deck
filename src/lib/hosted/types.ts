export type HostedRole = "owner" | "admin" | "member" | "viewer";
export type HostedInviteRole = Exclude<HostedRole, "owner">;

export type HostedUserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedWorkspaceRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedWorkspaceMemberRecord = {
  id: string;
  userId: string;
  workspaceId: string;
  role: HostedRole;
  createdAt: string;
};

export type HostedServerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string;
  encryptedApiKey: string;
  apiKeyPreview: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedShortUrlVisibility = "private" | "workspace";

export type HostedShortUrlRecord = {
  id: string;
  workspaceId: string;
  serverId: string;
  shortCode: string;
  domain: string | null;
  shortUrl: string;
  ownerUserId: string;
  createdByUserId: string;
  visibility: HostedShortUrlVisibility;
  createdAt: string;
  updatedAt: string;
};

export type HostedWorkspaceInviteRecord = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  role: HostedInviteRole;
  codeHash: string;
  codePreview: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HostedSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type HostedStoreData = {
  schemaVersion: 1;
  users: HostedUserRecord[];
  workspaces: HostedWorkspaceRecord[];
  workspaceMembers: HostedWorkspaceMemberRecord[];
  servers: HostedServerRecord[];
  shortUrls: HostedShortUrlRecord[];
  invites: HostedWorkspaceInviteRecord[];
  sessions: HostedSessionRecord[];
};

export type HostedUser = {
  id: string;
  name: string;
  email: string;
};

export type HostedWorkspace = {
  id: string;
  name: string;
  role: HostedRole;
};

export type HostedWorkspaceMember = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  role: HostedRole;
  createdAt: string;
};

export type HostedServer = {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string;
  apiKeyPreview: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedWorkspaceInvite = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  role: HostedInviteRole;
  codePreview: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HostedSession = {
  user: HostedUser;
  workspaces: HostedWorkspace[];
};
