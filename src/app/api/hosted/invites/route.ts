import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { toPublicHostedInvite } from "@/lib/hosted/mappers";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedInviteCreateSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

function getWorkspaceId(request: Request, fallback?: string) {
  const url = new URL(request.url);
  return url.searchParams.get("workspaceId") || fallback || "";
}

export async function GET(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  const workspaceId = getWorkspaceId(request, auth.session.workspaces[0]?.id);
  if (!workspaceId) {
    return apiError("NOT_FOUND", "No workspace is available.", 404);
  }

  try {
    const invites = await hostedStore.listInvites(auth.session.user.id, workspaceId);
    if (!invites) {
      return apiError("FORBIDDEN", "You do not have access to this workspace.", 403);
    }

    return noStoreJson({
      workspaceId,
      invites: invites.map(toPublicHostedInvite)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage invites in this workspace.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not load invites.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const input = hostedInviteCreateSchema.parse(await readJson(request, {}));
    const { invite, code } = await hostedStore.createInvite(auth.session.user.id, input);

    return noStoreJson(
      {
        invite: toPublicHostedInvite(invite),
        code
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot create this invite.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not create invite.", 500);
  }
}
