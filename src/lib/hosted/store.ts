import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { createId } from "@/lib/hosted/crypto";
import { getHostedDataPath } from "@/lib/hosted/env";
import type {
  HostedRole,
  HostedServerRecord,
  HostedSessionRecord,
  HostedStoreData,
  HostedUserRecord,
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

function roleCanManageServers(role: HostedRole) {
  return role === "owner" || role === "admin" || role === "member";
}

export const hostedStore = {
  async getUserByEmail(email: string) {
    const data = await readData();
    return data.users.find((user) => user.email === normalizeEmail(email)) ?? null;
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
