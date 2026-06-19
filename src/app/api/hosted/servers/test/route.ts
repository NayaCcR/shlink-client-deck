import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { decryptSecret } from "@/lib/hosted/crypto";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedServerTestSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";
import { createShlinkClient } from "@/lib/shlink/client";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const input = hostedServerTestSchema.parse(await readJson(request, {}));
    let baseUrl = input.baseUrl;
    let apiKey = input.apiKey;

    if (input.serverId) {
      const access = await hostedStore.getServerForUser(auth.session.user.id, input.serverId);
      if (!access) {
        return apiError("NOT_FOUND", "Server not found.", 404);
      }

      baseUrl = baseUrl || access.server.baseUrl;
      apiKey = apiKey || decryptSecret(access.server.encryptedApiKey);
    }

    if (!baseUrl || !apiKey) {
      return apiError("BAD_REQUEST", "A Shlink API URL and API key are required.", 400);
    }

    const client = createShlinkClient({
      baseUrl,
      apiKey
    });
    const health = await client.health();
    const shortUrls = await client
      .listShortUrls({
        page: 1,
        itemsPerPage: 1
      })
      .then(() => ({
        ok: true,
        message: "servers.connectionAccessible"
      }))
      .catch((error: unknown) => ({
        ok: false,
        message: getShlinkErrorMessage(error)
      }));

    return noStoreJson({
      health,
      shortUrls
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return apiError("UPSTREAM_ERROR", getShlinkErrorMessage(error), 502);
  }
}
