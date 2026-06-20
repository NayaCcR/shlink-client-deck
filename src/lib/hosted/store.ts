import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  createId,
  createToken,
  hashOpaqueToken,
  hashToken,
  verifyPassword
} from "@/lib/hosted/crypto";
import { getHostedDataPath } from "@/lib/hosted/env";
import {
  canReadShortUrlRecord,
  roleCanCreateShortUrls,
  roleCanAssignMemberRole,
  roleCanInviteRole,
  roleCanManageInvites,
  roleCanManageMemberRole,
  roleCanManageMembers,
  roleCanManageServers,
  roleCanManageShortUrl,
  roleCanResetMemberPassword,
  roleCanSeeWorkspaceOverview
} from "@/lib/hosted/permissions";
import type {
  HostedRole,
  HostedInviteRole,
  HostedServerRecord,
  HostedShortUrlProtectionRecord,
  HostedShortUrlRecord,
  HostedSessionRecord,
  HostedStoreData,
  HostedUserRecord,
  HostedWorkspaceInviteRecord,
  HostedWorkspace,
  HostedWorkspaceMemberRecord,
  HostedWorkspaceRecord
} from "@/lib/hosted/types";
import { normalizeBaseUrl } from "@/lib/utils";

const INITIAL_STORE: HostedStoreData = {
  schemaVersion: 1,
  users: [],
  workspaces: [],
  workspaceMembers: [],
  servers: [],
  shortUrls: [],
  invites: [],
  sessions: []
};

let writeQueue: Promise<unknown> = Promise.resolve();

function cloneInitialStore(): HostedStoreData {
  return JSON.parse(JSON.stringify(INITIAL_STORE)) as HostedStoreData;
}

function resolveStorePath() {
  const configured = getHostedDataPath();
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), ".link-console", configured);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeData(value: unknown): HostedStoreData {
  if (!value || typeof value !== "object") {
    return cloneInitialStore();
  }

  const data = value as Partial<HostedStoreData>;
  return {
    schemaVersion: 1,
    users: Array.isArray(data.users) ? data.users : [],
    workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
    workspaceMembers: Array.isArray(data.workspaceMembers) ? data.workspaceMembers : [],
    servers: Array.isArray(data.servers) ? data.servers : [],
    shortUrls: Array.isArray(data.shortUrls) ? data.shortUrls : [],
    invites: Array.isArray(data.invites) ? data.invites : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : []
  };
}

function removeExpiredSessions(data: HostedStoreData) {
  const timestamp = Date.now();
  data.sessions = data.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > timestamp
  );
}

async function readData() {
  const storePath = resolveStorePath();

  try {
    const content = await readFile(storePath, "utf8");
    const data = sanitizeData(JSON.parse(content));
    removeExpiredSessions(data);
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return cloneInitialStore();
    }

    throw error;
  }
}

async function writeData(data: HostedStoreData) {
  const storePath = resolveStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function updateData<T>(mutator: (data: HostedStoreData) => T | Promise<T>) {
  const run = writeQueue.then(async () => {
    const data = await readData();
    const result = await mutator(data);
    await writeData(data);
    return result;
  });

  writeQueue = run.catch(() => undefined);
  return run;
}

function normalizeDomain(domain?: string | null) {
  const value = domain?.trim();
  return value ? value : null;
}

function shortUrlMatches(
  record: HostedShortUrlRecord,
  input: { serverId: string; shortCode: string; domain?: string | null }
) {
  return (
    record.serverId === input.serverId &&
    record.shortCode === input.shortCode &&
    record.domain === normalizeDomain(input.domain)
  );
}

function normalizeInviteCode(code: string) {
  return code.trim();
}

function inviteCodePreview(code: string) {
  const value = normalizeInviteCode(code);
  return value ? `last-${value.slice(-6)}` : "empty";
}

function validateInvite(invite: HostedWorkspaceInviteRecord) {
  if (invite.disabledAt) {
    throw new Error("INVITE_DISABLED");
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    throw new Error("INVITE_EXPIRED");
  }

  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    throw new Error("INVITE_USED_UP");
  }
}

function workspaceOwnerCount(data: HostedStoreData, workspaceId: string) {
  return data.workspaceMembers.filter(
    (member) => member.workspaceId === workspaceId && member.role === "owner"
  ).length;
}

export const hostedStore = {
  async getUserByEmail(email: string) {
    const data = await readData();
    return data.users.find((user) => user.email === normalizeEmail(email)) ?? null;
  },

  async getUserById(userId: string) {
    const data = await readData();
    return data.users.find((user) => user.id === userId) ?? null;
  },

  async updateUserPassword(userId: string, passwordHash: string) {
    return updateData((data) => {
      const user = data.users.find((item) => item.id === userId);
      if (!user) {
        return null;
      }

      user.passwordHash = passwordHash;
      user.updatedAt = nowIso();
      return user;
    });
  },

  async createUserWithWorkspace(input: {
    name: string;
    email: string;
    passwordHash: string;
    workspaceName?: string;
  }) {
    return updateData((data) => {
      const email = normalizeEmail(input.email);
      if (data.users.some((user) => user.email === email)) {
        throw new Error("EMAIL_EXISTS");
      }

      const timestamp = nowIso();
      const user: HostedUserRecord = {
        id: createId("user"),
        name: input.name.trim(),
        email,
        passwordHash: input.passwordHash,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const workspace: HostedWorkspaceRecord = {
        id: createId("wsp"),
        name: input.workspaceName?.trim() || `${user.name} Workspace`,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const member: HostedWorkspaceMemberRecord = {
        id: createId("mem"),
        userId: user.id,
        workspaceId: workspace.id,
        role: "owner",
        createdAt: timestamp
      };

      data.users.push(user);
      data.workspaces.push(workspace);
      data.workspaceMembers.push(member);

      return { user, workspace };
    });
  },

  async createUserWithInvite(input: {
    name: string;
    email: string;
    passwordHash: string;
    inviteCode: string;
  }) {
    return updateData((data) => {
      const email = normalizeEmail(input.email);
      if (data.users.some((user) => user.email === email)) {
        throw new Error("EMAIL_EXISTS");
      }

      const code = normalizeInviteCode(input.inviteCode);
      const invite = data.invites.find((item) => item.codeHash === hashToken(code));
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }

      validateInvite(invite);

      const workspace = data.workspaces.find((item) => item.id === invite.workspaceId);
      if (!workspace) {
        throw new Error("INVITE_NOT_FOUND");
      }

      const timestamp = nowIso();
      const user: HostedUserRecord = {
        id: createId("user"),
        name: input.name.trim(),
        email,
        passwordHash: input.passwordHash,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const member: HostedWorkspaceMemberRecord = {
        id: createId("mem"),
        userId: user.id,
        workspaceId: workspace.id,
        role: invite.role,
        createdAt: timestamp
      };

      invite.uses += 1;
      invite.updatedAt = timestamp;
      data.users.push(user);
      data.workspaceMembers.push(member);

      return { user, workspace, member };
    });
  },

  async listInvites(userId: string, workspaceId: string) {
    const data = await readData();
    const member = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === workspaceId
    );
    if (!member) {
      return null;
    }

    if (!roleCanManageInvites(member.role)) {
      throw new Error("FORBIDDEN");
    }

    return data.invites
      .filter((invite) => invite.workspaceId === workspaceId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  },

  async createInvite(
    userId: string,
    input: {
      workspaceId: string;
      role: HostedInviteRole;
      maxUses?: number | null;
      expiresAt?: string | null;
    }
  ) {
    return updateData((data) => {
      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === input.workspaceId
      );
      if (!member || !roleCanInviteRole(member.role, input.role)) {
        throw new Error("FORBIDDEN");
      }

      const code = createToken();
      const timestamp = nowIso();
      const invite: HostedWorkspaceInviteRecord = {
        id: createId("inv"),
        workspaceId: input.workspaceId,
        createdByUserId: userId,
        role: input.role,
        codeHash: hashToken(code),
        codePreview: inviteCodePreview(code),
        maxUses: input.maxUses ?? null,
        uses: 0,
        expiresAt: input.expiresAt ?? null,
        disabledAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      data.invites.push(invite);
      return { invite, code };
    });
  },

  async disableInvite(userId: string, inviteId: string) {
    return updateData((data) => {
      const invite = data.invites.find((item) => item.id === inviteId);
      if (!invite) {
        return null;
      }

      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === invite.workspaceId
      );
      if (!member || !roleCanInviteRole(member.role, invite.role)) {
        throw new Error("FORBIDDEN");
      }

      const timestamp = nowIso();
      invite.disabledAt = timestamp;
      invite.updatedAt = timestamp;
      return invite;
    });
  },

  async listWorkspaceMembers(userId: string, workspaceId: string) {
    const data = await readData();
    const actor = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === workspaceId
    );
    if (!actor) {
      return null;
    }

    if (!roleCanManageMembers(actor.role)) {
      throw new Error("FORBIDDEN");
    }

    return data.workspaceMembers
      .filter((member) => member.workspaceId === workspaceId)
      .map((member) => {
        const user = data.users.find((item) => item.id === member.userId);
        return user ? { member, user } : null;
      })
      .filter(Boolean)
      .sort((first, second) => {
        const roleOrder: Record<HostedRole, number> = {
          owner: 0,
          admin: 1,
          member: 2,
          viewer: 3
        };
        if (!first || !second) {
          return 0;
        }
        return (
          roleOrder[first.member.role] - roleOrder[second.member.role] ||
          first.user.email.localeCompare(second.user.email)
        );
      }) as Array<{
        member: HostedWorkspaceMemberRecord;
        user: HostedUserRecord;
      }>;
  },

  async updateWorkspaceMemberRole(userId: string, memberId: string, role: HostedInviteRole) {
    return updateData((data) => {
      const target = data.workspaceMembers.find((item) => item.id === memberId);
      if (!target) {
        return null;
      }

      const actor = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === target.workspaceId
      );
      if (
        !actor ||
        actor.id === target.id ||
        !roleCanManageMemberRole(actor.role, target.role) ||
        !roleCanAssignMemberRole(actor.role, role)
      ) {
        throw new Error("FORBIDDEN");
      }

      target.role = role;
      return target;
    });
  },

  async resetWorkspaceMemberPassword(userId: string, memberId: string, passwordHash: string) {
    return updateData((data) => {
      const target = data.workspaceMembers.find((item) => item.id === memberId);
      if (!target) {
        return null;
      }

      const actor = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === target.workspaceId
      );
      if (
        !actor ||
        actor.id === target.id ||
        !roleCanResetMemberPassword(actor.role, target.role)
      ) {
        throw new Error("FORBIDDEN");
      }

      const targetUser = data.users.find((item) => item.id === target.userId);
      if (!targetUser) {
        return null;
      }

      targetUser.passwordHash = passwordHash;
      targetUser.updatedAt = nowIso();
      data.sessions = data.sessions.filter((session) => session.userId !== target.userId);
      return { member: target, user: targetUser };
    });
  },

  async removeWorkspaceMember(userId: string, memberId: string) {
    return updateData((data) => {
      const target = data.workspaceMembers.find((item) => item.id === memberId);
      if (!target) {
        return false;
      }

      const actor = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === target.workspaceId
      );
      if (
        !actor ||
        actor.id === target.id ||
        !roleCanManageMemberRole(actor.role, target.role)
      ) {
        throw new Error("FORBIDDEN");
      }

      if (target.role === "owner" && workspaceOwnerCount(data, target.workspaceId) <= 1) {
        throw new Error("LAST_OWNER");
      }

      data.workspaceMembers = data.workspaceMembers.filter((item) => item.id !== memberId);
      data.sessions = data.sessions.filter((session) => session.userId !== target.userId);
      return true;
    });
  },

  async createSession(input: { tokenHash: string; userId: string; expiresAt: string }) {
    return updateData((data) => {
      const timestamp = nowIso();
      const session: HostedSessionRecord = {
        id: createId("ses"),
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        createdAt: timestamp
      };

      data.sessions.push(session);
      return session;
    });
  },

  async deleteSession(tokenHash: string) {
    return updateData((data) => {
      data.sessions = data.sessions.filter((session) => session.tokenHash !== tokenHash);
    });
  },

  async getSession(tokenHash: string) {
    const data = await readData();
    const session = data.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) {
      return null;
    }

    const user = data.users.find((item) => item.id === session.userId);
    if (!user) {
      return null;
    }

    const workspaces = data.workspaceMembers
      .filter((member) => member.userId === user.id)
      .map<HostedWorkspace | null>((member) => {
        const workspace = data.workspaces.find((item) => item.id === member.workspaceId);
        if (!workspace) {
          return null;
        }

        return {
          id: workspace.id,
          name: workspace.name,
          role: member.role
        };
      })
      .filter(Boolean) as HostedWorkspace[];

    return { session, user, workspaces };
  },

  async getMembership(userId: string, workspaceId: string) {
    const data = await readData();
    return (
      data.workspaceMembers.find(
        (member) => member.userId === userId && member.workspaceId === workspaceId
      ) ?? null
    );
  },

  async listServers(userId: string, workspaceId: string) {
    const data = await readData();
    const member = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === workspaceId
    );
    if (!member) {
      return null;
    }

    return data.servers.filter((server) => server.workspaceId === workspaceId);
  },

  async getServerForUser(userId: string, serverId: string) {
    const data = await readData();
    const server = data.servers.find((item) => item.id === serverId);
    if (!server) {
      return null;
    }

    const member = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === server.workspaceId
    );
    if (!member) {
      return null;
    }

    return { server, member };
  },

  async listVisibleShortUrlRecords(userId: string, serverId: string) {
    const data = await readData();
    const server = data.servers.find((item) => item.id === serverId);
    if (!server) {
      return null;
    }

    const member = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === server.workspaceId
    );
    if (!member) {
      return null;
    }

    const records = data.shortUrls.filter((record) => record.serverId === serverId);
    return {
      server,
      member,
      records: roleCanSeeWorkspaceOverview(member.role)
        ? records
        : records.filter((record) => canReadShortUrlRecord(record, userId))
    };
  },

  async getShortUrlAccessForUser(
    userId: string,
    input: { serverId: string; shortCode: string; domain?: string | null }
  ) {
    const data = await readData();
    const server = data.servers.find((item) => item.id === input.serverId);
    if (!server) {
      return null;
    }

    const member = data.workspaceMembers.find(
      (item) => item.userId === userId && item.workspaceId === server.workspaceId
    );
    if (!member) {
      return null;
    }

    const matchingRecords = data.shortUrls.filter(
      (record) => record.serverId === input.serverId && record.shortCode === input.shortCode
    );
    const record =
      input.domain === undefined
        ? matchingRecords.length === 1
          ? matchingRecords[0]
          : null
        : matchingRecords.find((item) => item.domain === normalizeDomain(input.domain)) ?? null;

    const canSeeAll = roleCanSeeWorkspaceOverview(member.role);
    return {
      server,
      member,
      record,
      canRead: canSeeAll || Boolean(record && canReadShortUrlRecord(record, userId)),
      canManage: roleCanManageShortUrl(member.role, record ?? null, userId)
    };
  },

  async upsertShortUrlRecord(
    userId: string,
    input: {
      serverId: string;
      shortCode: string;
      domain?: string | null;
      shortUrl: string;
      visibility?: "private" | "workspace";
      protection?: HostedShortUrlProtectionRecord | null;
    }
  ) {
    return updateData((data) => {
      const server = data.servers.find((item) => item.id === input.serverId);
      if (!server) {
        throw new Error("NOT_FOUND");
      }

      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === server.workspaceId
      );
      if (!member || !roleCanCreateShortUrls(member.role)) {
        throw new Error("FORBIDDEN");
      }

      const timestamp = nowIso();
      const existing = data.shortUrls.find((record) => shortUrlMatches(record, input));
      if (existing) {
        existing.shortUrl = input.shortUrl;
        existing.protection = input.protection ?? existing.protection ?? null;
        existing.updatedAt = timestamp;
        return existing;
      }

      const record: HostedShortUrlRecord = {
        id: createId("surl"),
        workspaceId: server.workspaceId,
        serverId: input.serverId,
        shortCode: input.shortCode,
        domain: normalizeDomain(input.domain),
        shortUrl: input.shortUrl,
        ownerUserId: userId,
        createdByUserId: userId,
        visibility: input.visibility ?? "private",
        protection: input.protection ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      data.shortUrls.push(record);
      return record;
    });
  },

  async deleteShortUrlRecord(
    userId: string,
    input: { serverId: string; shortCode: string; domain?: string | null }
  ) {
    return updateData((data) => {
      const server = data.servers.find((item) => item.id === input.serverId);
      if (!server) {
        return false;
      }

      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === server.workspaceId
      );
      if (!member) {
        throw new Error("FORBIDDEN");
      }

      const record = data.shortUrls.find((item) => shortUrlMatches(item, input)) ?? null;
      if (!roleCanManageShortUrl(member.role, record, userId)) {
        throw new Error("FORBIDDEN");
      }

      data.shortUrls = data.shortUrls.filter((item) => !shortUrlMatches(item, input));
      return true;
    });
  },

  async unlockProtectedShortUrl(token: string, password: string) {
    return updateData((data) => {
      const tokenHash = hashOpaqueToken(token);
      const record =
        data.shortUrls.find((item) => item.protection?.accessTokenHash === tokenHash) ?? null;
      if (!record?.protection) {
        return null;
      }

      if (!verifyPassword(password, record.protection.passwordHash)) {
        throw new Error("UNAUTHORIZED");
      }

      const timestamp = nowIso();
      record.protection.unlocks += 1;
      record.protection.lastUnlockedAt = timestamp;
      record.protection.updatedAt = timestamp;
      record.updatedAt = timestamp;

      return record.protection.targetUrlEncrypted;
    });
  },

  async createServer(
    userId: string,
    input: Omit<
      HostedServerRecord,
      "id" | "createdAt" | "updatedAt" | "workspaceId"
    > & {
      workspaceId: string;
    }
  ) {
    return updateData((data) => {
      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === input.workspaceId
      );
      if (!member || !roleCanManageServers(member.role)) {
        throw new Error("FORBIDDEN");
      }

      const timestamp = nowIso();
      const server: HostedServerRecord = {
        id: createId("srv"),
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        baseUrl: normalizeBaseUrl(input.baseUrl),
        encryptedApiKey: input.encryptedApiKey,
        apiKeyPreview: input.apiKeyPreview,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      data.servers.push(server);
      return server;
    });
  },

  async updateServer(
    userId: string,
    serverId: string,
    input: Partial<Pick<HostedServerRecord, "name" | "baseUrl" | "encryptedApiKey" | "apiKeyPreview">>
  ) {
    return updateData((data) => {
      const server = data.servers.find((item) => item.id === serverId);
      if (!server) {
        return null;
      }

      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === server.workspaceId
      );
      if (!member || !roleCanManageServers(member.role)) {
        throw new Error("FORBIDDEN");
      }

      server.name = input.name?.trim() ?? server.name;
      server.baseUrl = input.baseUrl ? normalizeBaseUrl(input.baseUrl) : server.baseUrl;
      server.encryptedApiKey = input.encryptedApiKey ?? server.encryptedApiKey;
      server.apiKeyPreview = input.apiKeyPreview ?? server.apiKeyPreview;
      server.updatedAt = nowIso();

      return server;
    });
  },

  async deleteServer(userId: string, serverId: string) {
    return updateData((data) => {
      const server = data.servers.find((item) => item.id === serverId);
      if (!server) {
        return false;
      }

      const member = data.workspaceMembers.find(
        (item) => item.userId === userId && item.workspaceId === server.workspaceId
      );
      if (!member || !roleCanManageServers(member.role)) {
        throw new Error("FORBIDDEN");
      }

      data.servers = data.servers.filter((item) => item.id !== serverId);
      return true;
    });
  }
};
