import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createToken, hashToken } from "@/lib/hosted/crypto";
import { isHostedModeEnabled } from "@/lib/hosted/env";
import { apiError } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";
import type { HostedSession, HostedUser, HostedWorkspace } from "@/lib/hosted/types";

const SESSION_COOKIE = "link_console_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function expiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
}

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  siteRole?: "site_owner" | "user";
  mustChangeProfile?: boolean;
}): HostedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    siteRole: user.siteRole ?? "user",
    mustChangeProfile: user.mustChangeProfile ?? false
  };
}

export function toPublicSession(input: {
  user: { id: string; name: string; email: string };
  workspaces: HostedWorkspace[];
}): HostedSession {
  return {
    user: toPublicUser(input.user),
    workspaces: input.workspaces
  };
}

export async function createHostedSession(userId: string) {
  const token = createToken();
  const tokenHash = hashToken(token);
  await hostedStore.createSession({
    tokenHash,
    userId,
    expiresAt: expiresAt()
  });
  return token;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getHostedSession() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const session = await hostedStore.getSession(hashToken(token));
  if (!session) {
    return null;
  }

  return session;
}

export async function requireHostedSession() {
  if (!isHostedModeEnabled()) {
    return {
      response: apiError(
        "HOSTED_DISABLED",
        "Hosted Mode is not enabled for this deployment.",
        404
      )
    };
  }

  const session = await getHostedSession();
  if (!session) {
    return {
      response: apiError("UNAUTHORIZED", "Please sign in to continue.", 401)
    };
  }

  return { session };
}
