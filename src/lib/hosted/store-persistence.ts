import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getHostedDatabaseUrl,
  getHostedDataPath,
  getHostedRedisKey,
  getHostedRedisUrl,
  getHostedSqlitePath,
  getHostedStoreDriver,
  getHostedStoreKey,
  getHostedStoreTable,
  getLegacyJsonImportPath,
  type HostedStoreDriver
} from "@/lib/hosted/env";
import type { HostedStoreData } from "@/lib/hosted/types";

const STORE_SCHEMA_VERSION = 1;
const JSON_COLUMN = "payload";

type JsonRecord = Record<string, unknown>;

type StorePersistence = {
  read(): Promise<unknown | null>;
  write(data: HostedStoreData): Promise<void>;
};

let persistencePromise: Promise<StorePersistence> | null = null;
const dynamicImport = new Function("specifier", "return import(specifier)") as <
  TModule
>(
  specifier: string
) => Promise<TModule>;

function resolveDataPath(configured: string) {
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), ".link-console", configured);
}

async function readJsonFile(configuredPath: string) {
  try {
    const content = await readFile(resolveDataPath(configuredPath), "utf8");
    return JSON.parse(content) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonFile(configuredPath: string, data: HostedStoreData) {
  const storePath = resolveDataPath(configuredPath);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function serialize(data: HostedStoreData) {
  return JSON.stringify(data);
}

function parsePayload(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as unknown;
  }

  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8")) as unknown;
  }

  return value;
}

function isHostedStoreData(value: unknown): value is HostedStoreData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<HostedStoreData>;
  return (
    Array.isArray(data.users) &&
    Array.isArray(data.workspaces) &&
    Array.isArray(data.workspaceMembers) &&
    Array.isArray(data.servers) &&
    Array.isArray(data.shortUrls) &&
    Array.isArray(data.invites) &&
    Array.isArray(data.sessions)
  );
}

function sqlIdentifier(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}

async function createJsonPersistence(): Promise<StorePersistence> {
  const dataPath = getHostedDataPath();
  return {
    read: () => readJsonFile(dataPath),
    write: (data) => writeJsonFile(dataPath, data)
  };
}

async function createSqlitePersistence(): Promise<StorePersistence> {
  const { DatabaseSync } = await import("node:sqlite");
  const storePath = resolveDataPath(getHostedSqlitePath());
  await mkdir(path.dirname(storePath), { recursive: true });

  const table = sqlIdentifier(getHostedStoreTable());
  const storeKey = getHostedStoreKey();
  const database = new DatabaseSync(storePath);

  database.exec(`
    CREATE TABLE IF NOT EXISTS ${table} (
      store_key TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      ${JSON_COLUMN} TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const readStatement = database.prepare(
    `SELECT ${JSON_COLUMN} FROM ${table} WHERE store_key = ? LIMIT 1`
  );
  const writeStatement = database.prepare(`
    INSERT INTO ${table} (store_key, schema_version, ${JSON_COLUMN}, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(store_key) DO UPDATE SET
      schema_version = excluded.schema_version,
      ${JSON_COLUMN} = excluded.${JSON_COLUMN},
      updated_at = excluded.updated_at
  `);

  return {
    async read() {
      const row = readStatement.get(storeKey) as JsonRecord | undefined;
      return parsePayload(row?.[JSON_COLUMN]);
    },
    async write(data) {
      writeStatement.run(
        storeKey,
        STORE_SCHEMA_VERSION,
        serialize(data),
        new Date().toISOString()
      );
    }
  };
}

async function createPostgresPersistence(): Promise<StorePersistence> {
  const databaseUrl = getHostedDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("PostgreSQL storage requires LINK_CONSOLE_DATABASE_URL or DATABASE_URL.");
  }

  let pg: typeof import("pg");
  try {
    pg = await dynamicImport<typeof import("pg")>("pg");
  } catch {
    throw new Error("PostgreSQL storage requires installing the optional 'pg' package.");
  }

  const table = sqlIdentifier(getHostedStoreTable());
  const storeKey = getHostedStoreKey();
  const pool = new pg.Pool({ connectionString: databaseUrl });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      store_key TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      ${JSON_COLUMN} JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  return {
    async read() {
      const result = await pool.query(
        `SELECT ${JSON_COLUMN} FROM ${table} WHERE store_key = $1 LIMIT 1`,
        [storeKey]
      );
      return parsePayload(result.rows[0]?.[JSON_COLUMN]);
    },
    async write(data) {
      await pool.query(
        `
          INSERT INTO ${table} (store_key, schema_version, ${JSON_COLUMN}, updated_at)
          VALUES ($1, $2, $3::jsonb, NOW())
          ON CONFLICT (store_key) DO UPDATE SET
            schema_version = EXCLUDED.schema_version,
            ${JSON_COLUMN} = EXCLUDED.${JSON_COLUMN},
            updated_at = EXCLUDED.updated_at
        `,
        [storeKey, STORE_SCHEMA_VERSION, serialize(data)]
      );
    }
  };
}

async function createMysqlPersistence(): Promise<StorePersistence> {
  const databaseUrl = getHostedDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("MySQL storage requires LINK_CONSOLE_DATABASE_URL or DATABASE_URL.");
  }

  let mysql: typeof import("mysql2/promise");
  try {
    mysql = await dynamicImport<typeof import("mysql2/promise")>("mysql2/promise");
  } catch {
    throw new Error("MySQL storage requires installing the optional 'mysql2' package.");
  }

  const table = sqlIdentifier(getHostedStoreTable());
  const storeKey = getHostedStoreKey();
  const pool = mysql.createPool(databaseUrl);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ${table} (
      store_key VARCHAR(191) PRIMARY KEY,
      schema_version INT NOT NULL,
      ${JSON_COLUMN} JSON NOT NULL,
      updated_at DATETIME NOT NULL
    )
  `);

  return {
    async read() {
      const [rows] = await pool.execute(
        `SELECT ${JSON_COLUMN} FROM ${table} WHERE store_key = ? LIMIT 1`,
        [storeKey]
      );
      const row = Array.isArray(rows) ? (rows[0] as JsonRecord | undefined) : undefined;
      return parsePayload(row?.[JSON_COLUMN]);
    },
    async write(data) {
      await pool.execute(
        `
          INSERT INTO ${table} (store_key, schema_version, ${JSON_COLUMN}, updated_at)
          VALUES (?, ?, CAST(? AS JSON), ?)
          ON DUPLICATE KEY UPDATE
            schema_version = VALUES(schema_version),
            ${JSON_COLUMN} = VALUES(${JSON_COLUMN}),
            updated_at = VALUES(updated_at)
        `,
        [storeKey, STORE_SCHEMA_VERSION, serialize(data), new Date()]
      );
    }
  };
}

async function createRedisPersistence(): Promise<StorePersistence> {
  const redisUrl = getHostedRedisUrl();
  if (!redisUrl) {
    throw new Error("Redis storage requires LINK_CONSOLE_REDIS_URL or REDIS_URL.");
  }

  let redisModule: typeof import("redis");
  try {
    redisModule = await dynamicImport<typeof import("redis")>("redis");
  } catch {
    throw new Error("Redis storage requires installing the optional 'redis' package.");
  }

  const client = redisModule.createClient({ url: redisUrl });
  client.on("error", () => undefined);
  await client.connect();

  const key = getHostedRedisKey();
  return {
    async read() {
      return parsePayload(await client.get(key));
    },
    async write(data) {
      await client.set(key, serialize(data));
    }
  };
}

async function createConfiguredPersistence() {
  const driver = getHostedStoreDriver();
  switch (driver) {
    case "json":
      return createJsonPersistence();
    case "postgres":
    case "pgsql":
      return createPostgresPersistence();
    case "mysql":
      return createMysqlPersistence();
    case "redis":
      return createRedisPersistence();
    case "sqlite":
    default:
      return createSqlitePersistence();
  }
}

async function readLegacyJsonImport(currentDriver: HostedStoreDriver) {
  const legacyPath = getLegacyJsonImportPath();
  if (!legacyPath || currentDriver === "json") {
    return null;
  }

  return readJsonFile(legacyPath);
}

async function getPersistence() {
  persistencePromise ??= createConfiguredPersistence();
  return persistencePromise;
}

export async function readHostedStoreData() {
  const persistence = await getPersistence();
  const data = await persistence.read();
  if (data) {
    return data;
  }

  const legacyData = await readLegacyJsonImport(getHostedStoreDriver());
  if (isHostedStoreData(legacyData)) {
    await persistence.write(legacyData);
  }

  return legacyData;
}

export async function writeHostedStoreData(data: HostedStoreData) {
  const persistence = await getPersistence();
  await persistence.write(data);
}
