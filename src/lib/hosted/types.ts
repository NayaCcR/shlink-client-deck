export type HostedRole = "owner" | "admin" | "member" | "viewer";
export type HostedInviteRole = Exclude<HostedRole, "owner">;
export type HostedSiteRole = "site_owner" | "user";

export type HostedUserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  siteRole: HostedSiteRole;
  mustChangeProfile: boolean;
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

export type HostedShortUrlProtectionRecord = {
  enabled: true;
  accessTokenHash: string;
  targetUrlEncrypted: string;
  passwordHash: string;
  unlocks: number;
  lastUnlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
  protection?: HostedShortUrlProtectionRecord | null;
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

/**
 * Token 的调用限制。每个列表为空数组时表示「不限制」。
 * serverIds 支持多选，因此一个 token 可以同时操作多个后端。
 */
export type HostedApiTokenRestrictions = {
  serverIds: string[];
  allowedOrigins: string[];
  allowedIps: string[];
  allowedCountries: string[];
};

export type HostedApiTokenRecord = {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPreview: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  /** 旧记录没有该字段，读取时按「无限制」处理。 */
  restrictions?: HostedApiTokenRestrictions | null;
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
  apiTokens: HostedApiTokenRecord[];
};

export type HostedApiToken = Omit<HostedApiTokenRecord, "tokenHash">;

export type HostedUser = {
  id: string;
  name: string;
  email: string;
  siteRole: HostedSiteRole;
  mustChangeProfile: boolean;
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

export type HostedSiteUser = {
  id: string;
  name: string;
  email: string;
  siteRole: HostedSiteRole;
  workspaceCount: number;
  createdAt: string;
  updatedAt: string;
  mustChangeProfile: boolean;
};

export type HostedSiteServer = {
  id: string;
  workspaceId: string;
  workspaceName: string;
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
