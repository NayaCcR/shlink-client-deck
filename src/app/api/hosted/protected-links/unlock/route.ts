import { ZodError, z } from "zod";

import { decryptSecret } from "@/lib/hosted/crypto";
import { apiError, noStoreJson, readJson, validationError } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

const protectedLinkUnlockSchema = z.object({
  token: z.string().trim().min(16).max(300),
  password: z.string().min(1).max(200)
});

export async function POST(request: Request) {
  try {
    const input = protectedLinkUnlockSchema.parse(await readJson(request, {}));
    const encryptedTargetUrl = await hostedStore.unlockProtectedShortUrl(
      input.token,
      input.password
    );

    if (!encryptedTargetUrl) {
      return apiError("NOT_FOUND", "Protected link not found.", 404);
    }

    let targetUrl: string;
    try {
      targetUrl = decryptSecret(encryptedTargetUrl);
    } catch {
      return apiError("INTERNAL_ERROR", "Protected target URL cannot be decrypted.", 500);
    }

    return noStoreJson({ targetUrl });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Password is incorrect.", 401);
    }

    return apiError("INTERNAL_ERROR", "Could not unlock protected link.", 500);
  }
}
