import type { TFunction } from "i18next";

export class ShlinkApiError extends Error {
  status: number;
  type?: string;
  detail?: string;
  title?: string;

  constructor(
    message: string,
    options: {
      status: number;
      type?: string;
      detail?: string;
      title?: string;
    }
  ) {
    super(message);
    this.name = "ShlinkApiError";
    this.status = options.status;
    this.type = options.type;
    this.detail = options.detail;
    this.title = options.title;
  }
}

export class ShlinkNetworkError extends Error {
  constructor(message = "Could not connect to Shlink. Check the API URL, network, or CORS settings.") {
    super(message);
    this.name = "ShlinkNetworkError";
  }
}

function translate(
  t: TFunction<"common"> | undefined,
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) {
  return t ? t(key, options) : fallback;
}

export function getShlinkErrorMessage(error: unknown, t?: TFunction<"common">) {
  if (error instanceof ShlinkApiError) {
    if (error.status === 401 || error.status === 403) {
      return translate(t, "errors.auth", "Connection rejected. Check whether the API key is valid.");
    }

    if (error.status === 404) {
      return translate(
        t,
        "errors.notFound",
        "The requested resource was not found. It may have been deleted or the API version may be incompatible."
      );
    }

    if (error.status >= 500) {
      return (
        error.detail ||
        translate(
          t,
          "errors.server500",
          "Shlink returned 500. The connection works, but this endpoint failed on the current instance. Check Shlink logs, API version, or reverse proxy settings."
        )
      );
    }

    return (
      error.detail ||
      error.message ||
      translate(t, "errors.apiStatus", `Shlink API returned an error: ${error.status}`, {
        status: error.status
      })
    );
  }

  if (error instanceof ShlinkNetworkError) {
    return translate(t, "errors.network", error.message);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return translate(t, "errors.unknown", "An unknown error occurred.");
}
