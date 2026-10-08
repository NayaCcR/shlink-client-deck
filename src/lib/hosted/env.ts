export type AppMode = "static" | "hosted";
export type HostedStoreDriver = "sqlite" | "postgres" | "pgsql" | "mysql" | "redis" | "json";

function readBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getAppMode(): AppMode {
  return process.env.NEXT_PUBLIC_APP_MODE === "hosted" ? "hosted" : "static";
}

export function isHostedModeEnabled() {
  return getAppMode() === "hosted";
}

export function getHostedDataPath() {
  return process.env.LINK_CONSOLE_DATA_PATH || "hosted-store.json";
}

export function getHostedStoreDriver(): HostedStoreDriver {
  const value = (
    process.env.LINK_CONSOLE_STORE_DRIVER ||
    process.env.LINK_CONSOLE_STORAGE_DRIVER ||
    "sqlite"
  )
    .trim()
    .toLowerCase();

  if (["sqlite", "postgres", "pgsql", "mysql", "redis", "json"].includes(value)) {
    return value as HostedStoreDriver;
  }

  return "sqlite";
}

export function getHostedStoreKey() {
  return process.env.LINK_CONSOLE_STORE_KEY || "default";
}

export function getHostedStoreTable() {
  return process.env.LINK_CONSOLE_STORE_TABLE || "link_console_store";
}

export function getHostedSqlitePath() {
  return process.env.LINK_CONSOLE_SQLITE_PATH || "hosted-store.sqlite";
}

export function getHostedDatabaseUrl() {
  return optionalValue(process.env.LINK_CONSOLE_DATABASE_URL || process.env.DATABASE_URL);
}

export function getHostedRedisUrl() {
  return optionalValue(process.env.LINK_CONSOLE_REDIS_URL || process.env.REDIS_URL);
}

export function getHostedRedisKey() {
  return process.env.LINK_CONSOLE_REDIS_KEY || "link-console:hosted-store";
}

export function getLegacyJsonImportPath() {
  const value = process.env.LINK_CONSOLE_LEGACY_JSON_IMPORT_PATH;
  if (value === "") {
    return null;
  }

  return value || getHostedDataPath();
}

export function getPublicAppUrl() {
  return process.env.LINK_CONSOLE_PUBLIC_URL?.replace(/\/+$/, "") || null;
}

export function getSessionSecret() {
  return process.env.AUTH_SECRET || "link-console-development-session-secret-change-me";
}

export function getCredentialSecret() {
  return (
    process.env.SHLINK_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    "link-console-development-credential-secret-change-me"
  );
}

export function getMailConfig() {
  return {
    enabled: readBoolean(process.env.LINK_CONSOLE_MAIL_ENABLED),
    from: optionalValue(process.env.LINK_CONSOLE_MAIL_FROM),
    smtp: {
      host: optionalValue(process.env.LINK_CONSOLE_SMTP_HOST || process.env.SMTP_HOST),
      port: Number(process.env.LINK_CONSOLE_SMTP_PORT || process.env.SMTP_PORT || 587),
      secure: readBoolean(process.env.LINK_CONSOLE_SMTP_SECURE || process.env.SMTP_SECURE),
      user: optionalValue(process.env.LINK_CONSOLE_SMTP_USER || process.env.SMTP_USER),
      password: optionalValue(
        process.env.LINK_CONSOLE_SMTP_PASSWORD || process.env.SMTP_PASSWORD
      )
    }
  };
}
