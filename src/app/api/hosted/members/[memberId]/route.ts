import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { toPublicHostedMember } from "@/lib/hosted/mappers";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedMemberUpdateSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

function memberError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return apiError("FORBIDDEN", "You cannot manage this member.", 403);
  }

  if (error instanceof Error && error.message === "LAST_OWNER") {
    return apiError("LAST_OWNER", "A workspace must keep at least one owner.", 409);
  }

  return apiError("INTERNAL_ERROR", fallback, 500);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { memberId } = await context.params;
    const input = hostedMemberUpdateSchema.parse(await readJson(request, {}));
    const member = await hostedStore.updateWorkspaceMemberRole(
      auth.session.user.id,
      memberId,
      input.role
    );
    if (!member) {
      return apiError("NOT_FOUND", "Member not found.", 404);
    }

    const user = await hostedStore.getUserById(member.userId);
    if (!user) {
      return apiError("NOT_FOUND", "Member user not found.", 404);
    }

    return noStoreJson({
      member: toPublicHostedMember({ member, user })
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return memberError(error, "Could not update member.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { memberId } = await context.params;
    const deleted = await hostedStore.removeWorkspaceMember(auth.session.user.id, memberId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Member not found.", 404);
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    return memberError(error, "Could not remove member.");
  }
}
