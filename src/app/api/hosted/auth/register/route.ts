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
    const account = input.inviteCode
      ? await hostedStore.createUserWithInvite({
          name: input.name,
          email: input.email,
          passwordHash: hashPassword(input.password),
          inviteCode: input.inviteCode
        })
      : await hostedStore.createUserWithWorkspace({
          name: input.name,
          email: input.email,
          passwordHash: hashPassword(input.password),
          workspaceName: input.workspaceName
        });
    const { user } = account;
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

    if (
      error instanceof Error &&
      [
        "INVITE_NOT_FOUND",
        "INVITE_DISABLED",
        "INVITE_EXPIRED",
        "INVITE_USED_UP"
      ].includes(error.message)
    ) {
      return apiError("INVITE_INVALID", "This invite code is invalid or no longer available.", 400);
    }

    return apiError("INTERNAL_ERROR", "Could not register account.", 500);
  }
}
