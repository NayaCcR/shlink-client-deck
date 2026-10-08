import { ZodError } from "zod";

import { requireHostedSession } from "@/lib/hosted/auth";
import { createToken, hashToken } from "@/lib/hosted/crypto";
import { normalizeTokenRestrictions } from "@/lib/hosted/request-limits";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedApiTokenCreateSchema } from "@/lib/hosted/schemas";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

function previewToken(token: string) {
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function publicToken(token: Awaited<ReturnType<typeof hostedStore.createApiToken>>) {
  const { tokenHash: _tokenHash, ...result } = token;
  return result;
}

export async function GET() {
  const auth = await requireHostedSession();
  if ("response" in auth) return auth.response;

  return noStoreJson({
    tokens: (await hostedStore.listApiTokens(auth.session.user.id)).map(publicToken)
  });
}

export async function POST(request: Request) {
  const auth = await requireHostedSession();
  if ("response" in auth) return auth.response;

  try {
    const input = hostedApiTokenCreateSchema.parse(await readJson(request, {}));
    const token = createToken();
    const record = await hostedStore.createApiToken({
      userId: auth.session.user.id,
      name: input.name,
      tokenHash: hashToken(token),
      tokenPreview: previewToken(token),
      expiresAt: input.expiresAt ?? null,
      restrictions: normalizeTokenRestrictions(input)
    });

    return noStoreJson({ token, record: publicToken(record) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return apiError("INTERNAL_ERROR", "Could not create API token.", 500);
  }
}
