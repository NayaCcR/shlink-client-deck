import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createHostedSession,
  setSessionCookie,
  toPublicSession
} from "@/lib/hosted/auth";
import { hashPassword, hashToken } from "@/lib/hosted/crypto";
import { isHostedModeEnabled } from "@/lib/hosted/env";
import { apiError, readJson, validationError } from "@/lib/hosted/responses";
import { hostedRegisterSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isHostedModeEnabled()) {
    return apiError("HOSTED_DISABLED", "Hosted Mode is not enabled for this deployment.", 404);
  }

  try {
    const input = hostedRegisterSchema.parse(await readJson(request, {}));
    const { user } = await hostedStore.createUserWithWorkspace({
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      workspaceName: input.workspaceName
    });
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

    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return apiError("CONFLICT", "An account with this email already exists.", 409);
    }

    return apiError("INTERNAL_ERROR", "Could not register account.", 500);
  }
}
