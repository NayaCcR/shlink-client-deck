export type AppMode = "static" | "hosted";

export function getAppMode(): AppMode {
  return process.env.NEXT_PUBLIC_APP_MODE === "hosted" ? "hosted" : "static";
}

export function isHostedModeEnabled() {
  return getAppMode() === "hosted";
}

export function getHostedDataPath() {
  return process.env.LINK_CONSOLE_DATA_PATH || "hosted-store.json";
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
