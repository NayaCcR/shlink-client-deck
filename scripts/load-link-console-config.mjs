import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { isAbsolute, join, resolve } from "path";

const DEFAULT_CONFIG_PATH = "link-console.config.json";

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

export async function loadLinkConsoleConfig(argv = process.argv.slice(2)) {
  const { path: requestedPath, argv: remainingArgv } = findConfigArg(argv);
  const configPath = normalizeConfigPath(requestedPath);
  process.env.LINK_CONSOLE_CONFIG = configPath;

  if (!existsSync(configPath)) {
    return {
      configPath,
      loaded: false,
      argv: remainingArgv
    };
  }

  const content = await readFile(configPath, "utf8");
  const config = JSON.parse(stripJsonComments(content));
  applyHostedConfig(config);

  return {
    configPath,
    loaded: true,
    argv: remainingArgv
  };
}

export function resolveProjectPath(relativePath) {
  return join(process.cwd(), relativePath);
}
