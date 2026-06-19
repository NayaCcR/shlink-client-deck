import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { encryptSecret, previewSecret } from "@/lib/hosted/crypto";
import { toPublicHostedServer } from "@/lib/hosted/mappers";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedServerCreateSchema } from "@/lib/hosted/schemas";
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

  const servers = await hostedStore.listServers(auth.session.user.id, workspaceId);
  if (!servers) {
    return apiError("FORBIDDEN", "You do not have access to this workspace.", 403);
  }

  return noStoreJson({
    workspaceId,
    servers: servers.map(toPublicHostedServer)
  });
}

export async function POST(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const input = hostedServerCreateSchema.parse(await readJson(request, {}));
    const server = await hostedStore.createServer(auth.session.user.id, {
      workspaceId: input.workspaceId,
      name: input.name,
      baseUrl: input.baseUrl,
      encryptedApiKey: encryptSecret(input.apiKey),
      apiKeyPreview: previewSecret(input.apiKey)
    });

    return noStoreJson(
      {
        server: toPublicHostedServer(server)
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage servers in this workspace.", 403);
    }

    return apiError("INTERNAL_ERROR", "Could not save server.", 500);
  }
}
