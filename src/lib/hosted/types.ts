export type HostedRole = "owner" | "admin" | "member" | "viewer";

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

export type HostedServer = {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string;
  apiKeyPreview: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedSession = {
  user: HostedUser;
  workspaces: HostedWorkspace[];
};
