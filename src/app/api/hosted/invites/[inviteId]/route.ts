import { requireHostedSession } from "@/lib/hosted/auth";
import { toPublicHostedInvite } from "@/lib/hosted/mappers";
import { apiError, noStoreJson } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    inviteId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { inviteId } = await context.params;
    const invite = await hostedStore.disableInvite(auth.session.user.id, inviteId);
    if (!invite) {
      return apiError("NOT_FOUND", "Invite not found.", 404);
    }

    return noStoreJson({
      invite: toPublicHostedInvite(invite)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot disable this invite.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not disable invite.", 500);
  }
}
