import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createHostedSession,
  setSessionCookie,
  toPublicSession
} from "@/lib/hosted/auth";
import { hashToken, verifyPassword } from "@/lib/hosted/crypto";
import { isHostedModeEnabled } from "@/lib/hosted/env";
import { apiError, readJson, validationError } from "@/lib/hosted/responses";
import { hostedLoginSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isHostedModeEnabled()) {
    return apiError("HOSTED_DISABLED", "Hosted Mode is not enabled for this deployment.", 404);
  }

  try {
    const input = hostedLoginSchema.parse(await readJson(request, {}));
    const user = await hostedStore.getUserByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return apiError("UNAUTHORIZED", "Invalid email or password.", 401);
    }

    const token = await createHostedSession(user.id);
    const session = await hostedStore.getSession(hashToken(token));
    if (!session) {
      return apiError("INTERNAL_ERROR", "Could not create session.", 500);
    }

    const response = NextResponse.json({
      session: toPublicSession({
        user: session.user,
        workspaces: session.workspaces
      })
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return apiError("INTERNAL_ERROR", "Could not sign in.", 500);
  }
}
