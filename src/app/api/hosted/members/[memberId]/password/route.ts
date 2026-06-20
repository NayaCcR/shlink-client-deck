import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { hashPassword } from "@/lib/hosted/crypto";
import { toPublicHostedMember } from "@/lib/hosted/mappers";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedMemberPasswordResetSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { memberId } = await context.params;
    const input = hostedMemberPasswordResetSchema.parse(await readJson(request, {}));
    const result = await hostedStore.resetWorkspaceMemberPassword(
      auth.session.user.id,
      memberId,
      hashPassword(input.password)
    );
    if (!result) {
      return apiError("NOT_FOUND", "Member not found.", 404);
    }

    return noStoreJson({
      member: toPublicHostedMember(result)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "Only workspace owners can reset member passwords.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not reset member password.", 500);
  }
}
