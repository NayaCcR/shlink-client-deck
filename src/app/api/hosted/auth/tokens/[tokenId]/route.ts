import { requireHostedSession } from "@/lib/hosted/auth";
import { apiError, noStoreJson } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tokenId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) return auth.response;

  const { tokenId } = await context.params;
  const token = await hostedStore.revokeApiToken(auth.session.user.id, tokenId);
  if (!token) return apiError("NOT_FOUND", "API token not found.", 404);

  return noStoreJson({ ok: true });
}
