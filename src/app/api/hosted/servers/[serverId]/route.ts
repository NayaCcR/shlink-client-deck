import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { encryptSecret, previewSecret } from "@/lib/hosted/crypto";
import { toPublicHostedServer } from "@/lib/hosted/mappers";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedServerUpdateSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    serverId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { serverId } = await context.params;
    const input = hostedServerUpdateSchema.parse(await readJson(request, {}));
    const server = await hostedStore.updateServer(auth.session.user.id, serverId, {
      name: input.name,
      baseUrl: input.baseUrl,
      encryptedApiKey: input.apiKey ? encryptSecret(input.apiKey) : undefined,
      apiKeyPreview: input.apiKey ? previewSecret(input.apiKey) : undefined
    });

    if (!server) {
      return apiError("NOT_FOUND", "Server not found.", 404);
    }

    return noStoreJson({
      server: toPublicHostedServer(server)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage this server.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not update server.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { serverId } = await context.params;
    const deleted = await hostedStore.deleteServer(auth.session.user.id, serverId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Server not found.", 404);
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage this server.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not delete server.", 500);
  }
}
