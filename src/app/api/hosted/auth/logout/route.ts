import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionToken } from "@/lib/hosted/auth";
import { hashToken } from "@/lib/hosted/crypto";
import { isHostedModeEnabled } from "@/lib/hosted/env";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

export async function POST() {
  if (isHostedModeEnabled()) {
    const token = await getSessionToken();
    if (token) {
      await hostedStore.deleteSession(hashToken(token));
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
