import { requireHostedSession } from "@/lib/hosted/auth";
import { decryptSecret } from "@/lib/hosted/crypto";
import { apiError } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    serverId: string;
    path: string[];
  }>;
};

const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

function makeUpstreamUrl(baseUrl: string, segments: string[], requestUrl: string) {
  const sourceUrl = new URL(requestUrl);
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${baseUrl}/rest/v3/${path}${sourceUrl.search}`;
}

async function proxyShlinkRequest(request: Request, context: RouteContext) {
  const method = request.method.toUpperCase();
  if (!SUPPORTED_METHODS.includes(method as (typeof SUPPORTED_METHODS)[number])) {
    return apiError("BAD_REQUEST", "Unsupported Shlink proxy method.", 405);
  }

  const auth = await requireHostedSession();
  if ("response" in auth) {
    return auth.response;
  }

  const { serverId, path } = await context.params;
  const access = await hostedStore.getServerForUser(auth.session.user.id, serverId);
  if (!access) {
    return apiError("NOT_FOUND", "Server not found.", 404);
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(access.server.encryptedApiKey);
  } catch {
    return apiError("INTERNAL_ERROR", "Stored Shlink credentials cannot be decrypted.", 500);
  }

  const upstreamUrl = makeUpstreamUrl(access.server.baseUrl, path, request.url);
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? await request.text() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        Accept: "application/json, application/health+json",
        "Content-Type": request.headers.get("content-type") || "application/json",
        "X-Api-Key": apiKey
      },
      body
    });

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    const requestId = upstream.headers.get("x-request-id");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }
    if (requestId) {
      responseHeaders.set("X-Request-Id", requestId);
    }
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch {
    return apiError("UPSTREAM_ERROR", "Could not reach the configured Shlink server.", 502);
  }
}

export function GET(request: Request, context: RouteContext) {
  return proxyShlinkRequest(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return proxyShlinkRequest(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return proxyShlinkRequest(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return proxyShlinkRequest(request, context);
}
