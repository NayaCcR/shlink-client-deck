import { randomBytes } from "crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, isAbsolute, join, resolve } from "path";

const DEFAULT_CONFIG_PATH = "link-console.config.json";
const GENERATED_SECRETS_PATH = ".link-console/generated-secrets.json";
const SECRET_MIN_LENGTH = 32;
const SESSION_SECRET_FALLBACK = "link-console-development-session-secret-change-me";
const CREDENTIAL_SECRET_FALLBACK = "link-console-development-credential-secret-change-me";
const PLACEHOLDER_SECRETS = new Set([
  "replace-with-a-long-random-value",
  "replace-with-another-long-random-value",
  SESSION_SECRET_FALLBACK,
  CREDENTIAL_SECRET_FALLBACK
]);

function normalizeConfigPath(value) {
  const configured = value || process.env.LINK_CONSOLE_CONFIG || DEFAULT_CONFIG_PATH;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function findConfigArg(argv) {
  const index = argv.findIndex((arg) => arg === "--config" || arg === "-c");
  if (index >= 0) {
    return {
      path: argv[index + 1],
      argv: argv.filter((_, itemIndex) => itemIndex !== index && itemIndex !== index + 1)
    };
  }

  const inline = argv.find((arg) => arg.startsWith("--config="));
  if (inline) {
    return {
      path: inline.slice("--config=".length),
      argv: argv.filter((arg) => arg !== inline)
    };
  }

  return {
    path: undefined,
    argv
  };
}

function applyEnvValue(name, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  process.env[name] = String(value);
}

function stripJsonComments(content) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaping = false;

  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    const next = content[index + 1];

    if (inString) {
      output += current;
      if (escaping) {
        escaping = false;
      } else if (current === "\\") {
        escaping = true;
      } else if (current === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (current === "\"" || current === "'") {
      inString = true;
      quote = current;
      output += current;
      continue;
    }

    if (current === "/" && next === "/") {
      while (index < content.length && content[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }

    if (current === "/" && next === "*") {
      index += 2;
      while (index < content.length && !(content[index] === "*" && content[index + 1] === "/")) {
        if (content[index] === "\n") {
          output += "\n";
        }
        index += 1;
      }
      index += 1;
      continue;
    }

    output += current;
  }

  return output;
}

function applyHostedConfig(config) {
  const app = config.app || {};
  const security = config.security || {};
  const storage = config.storage || {};
  const mail = config.mail || {};
  const smtp = mail.smtp || {};

  applyEnvValue("NEXT_PUBLIC_APP_MODE", app.mode);
  applyEnvValue("LINK_CONSOLE_PUBLIC_URL", app.publicUrl);
  applyEnvValue("AUTH_SECRET", security.authSecret);
  applyEnvValue("SHLINK_CREDENTIAL_ENCRYPTION_KEY", security.credentialEncryptionKey);

  applyEnvValue("LINK_CONSOLE_STORE_DRIVER", storage.driver);
  applyEnvValue("LINK_CONSOLE_STORE_KEY", storage.storeKey);
  applyEnvValue("LINK_CONSOLE_STORE_TABLE", storage.table);
  applyEnvValue("LINK_CONSOLE_SQLITE_PATH", storage.sqlite?.path);
  applyEnvValue("LINK_CONSOLE_DATABASE_URL", storage.databaseUrl);
  applyEnvValue("LINK_CONSOLE_REDIS_URL", storage.redis?.url);
  applyEnvValue("LINK_CONSOLE_REDIS_KEY", storage.redis?.key);
  applyEnvValue("LINK_CONSOLE_DATA_PATH", storage.legacyJson?.path);
  applyEnvValue("LINK_CONSOLE_LEGACY_JSON_IMPORT_PATH", storage.legacyJson?.importPath);

  applyEnvValue("LINK_CONSOLE_MAIL_ENABLED", mail.enabled);
  applyEnvValue("LINK_CONSOLE_MAIL_FROM", mail.from);
  applyEnvValue("LINK_CONSOLE_SMTP_HOST", smtp.host);
  applyEnvValue("LINK_CONSOLE_SMTP_PORT", smtp.port);
  applyEnvValue("LINK_CONSOLE_SMTP_SECURE", smtp.secure);
  applyEnvValue("LINK_CONSOLE_SMTP_USER", smtp.user);
  applyEnvValue("LINK_CONSOLE_SMTP_PASSWORD", smtp.password);
}

function isUsableSecret(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length >= SECRET_MIN_LENGTH && !PLACEHOLDER_SECRETS.has(trimmed);
}

function randomSecret() {
  return randomBytes(32).toString("base64url");
}

function resolveGeneratedSecretsPath() {
  return resolve(process.cwd(), GENERATED_SECRETS_PATH);
}

function readGeneratedSecrets() {
  const secretsPath = resolveGeneratedSecretsPath();
  if (!existsSync(secretsPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(secretsPath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn(`[link-console] 无法解析 ${secretsPath}，将重新生成密钥。`);
    return {};
  }
}

function writeGeneratedSecrets(secrets) {
  const secretsPath = resolveGeneratedSecretsPath();
  mkdirSync(dirname(secretsPath), { recursive: true });
  writeFileSync(secretsPath, `${JSON.stringify(secrets, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(secretsPath, 0o600);
  } catch {
    // 非 POSIX 平台没有权限位，忽略。
  }

  return secretsPath;
}

function readConfiguredSecret(configValue, envName, fallback) {
  const configured = typeof configValue === "string" ? configValue.trim() : "";
  if (configured) {
    return configured;
  }

  return process.env[envName]?.trim() || fallback;
}

/**
 * 当配置文件里仍是示例占位符（或为空）时，生成一次随机密钥并落盘复用。
 * 密钥写入 .link-console/generated-secrets.json（0600，已被 .gitignore 覆盖），
 * 因此重启不会改变密钥 —— 否则每次重启都会让会话失效、已加密的 API Key 无法解密。
 */
export function ensureSecuritySecrets(config) {
  const security = config.security || {};

  if (process.env.LINK_CONSOLE_DISABLE_AUTO_SECRETS === "1") {
    return { enabled: false, generated: false, secretsPath: null, legacyCredentialKeys: [] };
  }

  const needsSession = !isUsableSecret(security.authSecret);
  const needsCredential = !isUsableSecret(security.credentialEncryptionKey);
  if (!needsSession && !needsCredential) {
    return { enabled: true, generated: false, secretsPath: null, legacyCredentialKeys: [] };
  }

  const stored = readGeneratedSecrets();
  const legacyCredentialKeys = new Set(
    Array.isArray(stored.legacyCredentialKeys)
      ? stored.legacyCredentialKeys.filter((item) => typeof item === "string" && item)
      : []
  );
  const rotated = [];

  if (needsCredential) {
    // 记录当前实际生效的旧密钥，让库里已加密的 Shlink API Key 仍可解密。
    const previous = readConfiguredSecret(
      security.credentialEncryptionKey,
      "SHLINK_CREDENTIAL_ENCRYPTION_KEY",
      readConfiguredSecret(security.authSecret, "AUTH_SECRET", CREDENTIAL_SECRET_FALLBACK)
    );
    if (previous && !legacyCredentialKeys.has(previous)) {
      legacyCredentialKeys.add(previous);
      rotated.push(previous);
    }
  }

  let changed = rotated.length > 0;
  if (needsSession && !isUsableSecret(stored.authSecret)) {
    stored.authSecret = randomSecret();
    changed = true;
  }
  if (needsCredential && !isUsableSecret(stored.credentialEncryptionKey)) {
    stored.credentialEncryptionKey = randomSecret();
    changed = true;
  }
  stored.legacyCredentialKeys = [...legacyCredentialKeys];
  stored.updatedAt = new Date().toISOString();

  const secretsPath =
    changed || !existsSync(resolveGeneratedSecretsPath())
      ? writeGeneratedSecrets(stored)
      : resolveGeneratedSecretsPath();

  if (needsSession) {
    applyEnvValue("AUTH_SECRET", stored.authSecret);
  }
  if (needsCredential) {
    applyEnvValue("SHLINK_CREDENTIAL_ENCRYPTION_KEY", stored.credentialEncryptionKey);
  }
  if (legacyCredentialKeys.size > 0) {
    applyEnvValue("LINK_CONSOLE_LEGACY_CREDENTIAL_KEYS", JSON.stringify([...legacyCredentialKeys]));
  }

  console.log("[link-console] 检测到示例占位符密钥，已启用自动生成。");
  console.log(`  AUTH_SECRET                      => ${needsSession ? "已生成" : "沿用配置文件"}`);
  console.log(`  SHLINK_CREDENTIAL_ENCRYPTION_KEY => ${needsCredential ? "已生成" : "沿用配置文件"}`);
  console.log(`  密钥文件                          => ${secretsPath}`);
  if (needsSession) {
    console.log("  提示：会话密钥变更后，现有登录会话与已创建的 API Token 全部失效，需要重新创建。");
  }
  if (rotated.length > 0) {
    console.log("  提示：旧加密密钥已登记为兼容密钥，已保存的 Shlink API Key 仍可正常解密。");
  }

  return {
    enabled: true,
    generated: true,
    secretsPath,
    legacyCredentialKeys: [...legacyCredentialKeys]
  };
}

export async function loadLinkConsoleConfig(argv = process.argv.slice(2), options = {}) {
  const { ensureSecrets = true } = options;
  const { path: requestedPath, argv: remainingArgv } = findConfigArg(argv);
  const configPath = normalizeConfigPath(requestedPath);
  process.env.LINK_CONSOLE_CONFIG = configPath;

  if (!existsSync(configPath)) {
    return {
      configPath,
      loaded: false,
      argv: remainingArgv,
      security: null
    };
  }

  const content = await readFile(configPath, "utf8");
  const config = JSON.parse(stripJsonComments(content));
  applyHostedConfig(config);
  const security = ensureSecrets ? ensureSecuritySecrets(config) : null;

  return {
    configPath,
    loaded: true,
    argv: remainingArgv,
    security
  };
}

export function resolveProjectPath(relativePath) {
  return join(process.cwd(), relativePath);
}
