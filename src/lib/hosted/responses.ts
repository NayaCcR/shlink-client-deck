import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type HostedApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "LAST_OWNER"
  | "INVITE_INVALID"
  | "HOSTED_DISABLED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export function apiError(
  code: HostedApiErrorCode,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}

export function validationError(error: ZodError) {
  return apiError("BAD_REQUEST", "Invalid request payload.", 400, error.flatten());
}

export async function readJson<T>(request: Request, fallback: T): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    return fallback;
  }

  return JSON.parse(text) as T;
}

export function noStoreJson<T>(payload: T, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
