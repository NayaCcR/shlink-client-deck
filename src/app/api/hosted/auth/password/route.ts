import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { hashPassword, verifyPassword } from "@/lib/hosted/crypto";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedPasswordChangeSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const input = hostedPasswordChangeSchema.parse(await readJson(request, {}));
    const user = await hostedStore.getUserById(auth.session.user.id);
    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    if (!verifyPassword(input.currentPassword, user.passwordHash)) {
      return apiError("UNAUTHORIZED", "Current password is incorrect.", 401);
    }

    await hostedStore.updateUserPassword(user.id, hashPassword(input.newPassword));
    return noStoreJson({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return apiError("INTERNAL_ERROR", "Could not change password.", 500);
  }
}
