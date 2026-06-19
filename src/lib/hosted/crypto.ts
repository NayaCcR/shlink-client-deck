import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual
} from "crypto";

import { getCredentialSecret, getSessionSecret } from "@/lib/hosted/env";
import { maskSecret } from "@/lib/utils";

const PASSWORD_ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function deriveKey(secret: string, salt: Buffer) {
  return pbkdf2Sync(secret, salt, 120_000, KEY_LENGTH, DIGEST);
}

export function createId(prefix: string) {
  return `${prefix}_${base64Url(randomBytes(18))}`;
}

export function createToken() {
  return base64Url(randomBytes(32));
}

export function hashToken(token: string) {
  return createHash("sha256").update(`${getSessionSecret()}:${token}`).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_LENGTH, DIGEST);
  return `pbkdf2:${PASSWORD_ITERATIONS}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationsValue, saltValue, hashValue] = storedHash.split(":");
  if (scheme !== "pbkdf2" || !iterationsValue || !saltValue || !hashValue) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64");
  const expected = Buffer.from(hashValue, "base64");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function encryptSecret(value: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(getCredentialSecret(), salt);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64")
  ].join(":");
}

export function decryptSecret(value: string) {
  const [version, saltValue, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !saltValue || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted credential payload.");
  }

  const key = deriveKey(getCredentialSecret(), Buffer.from(saltValue, "base64"));
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(ivValue, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function previewSecret(value: string) {
  return maskSecret(value, "Not set");
}
