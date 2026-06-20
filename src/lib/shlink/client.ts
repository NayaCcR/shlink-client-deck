import { normalizeBaseUrl } from "@/lib/utils";
import { ShlinkApiError, ShlinkNetworkError } from "@/lib/shlink/errors";
import type {
  ShlinkClientCredentials,
  ShlinkCreateShortUrlInput,
  ShlinkEditShortUrlInput,
  ShlinkHealth,
  ShlinkShortUrl,
  ShlinkShortUrlsResponse,
  ShlinkTagsResponse,
  ShlinkVisitsResponse,
  ShortUrlListParams,
  VisitsParams
} from "@/lib/shlink/types";

const DEFAULT_ITEMS_PER_PAGE = 20;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | string[] | undefined>;
  body?: unknown;
};

function buildQueryString(query?: RequestOptions["query"]) {
  if (!query) {
    return "";
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          search.append(key, item);
        }
      }
    } else {
      search.set(key, String(value));
    }
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = /\bjson\b|\+json\b/i.test(contentType);
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error?.message === "string"
            ? payload.error.message
          : undefined;

    throw new ShlinkApiError(detail || `Shlink API request failed with ${response.status}`, {
      status: response.status,
      type: typeof payload?.type === "string" ? payload.type : undefined,
      title: typeof payload?.title === "string" ? payload.title : undefined,
      detail
    });
  }

  return (payload ?? {}) as T;
}

function getShortUrlIdentifier(shortUrl: ShlinkShortUrl) {
  return shortUrl.shortCode;
}

function getDomainQuery(shortUrl: ShlinkShortUrl) {
  return shortUrl.domain ? { domain: shortUrl.domain } : undefined;
}

function emptyVisitsResponse(
  reason: string,
  itemsPerPage: number,
  reasonKey?: string
): ShlinkVisitsResponse {
  return {
    unavailableReason: reason,
    unavailableReasonKey: reasonKey,
    visits: {
      data: [],
      pagination: {
        currentPage: 1,
        pagesCount: 1,
        itemsPerPage,
        itemsInCurrentPage: 0,
        totalItems: 0
      }
    }
  };
}

export class ShlinkClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly serverId?: string;
  private readonly mode: "static" | "hosted";

  constructor(credentials: ShlinkClientCredentials) {
    this.baseUrl = normalizeBaseUrl(credentials.baseUrl);
    this.apiKey = credentials.apiKey;
    this.serverId = credentials.id;
    this.mode = credentials.mode === "hosted" ? "hosted" : "static";
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const isHosted = this.mode === "hosted";
    if (isHosted && !this.serverId) {
      throw new ShlinkNetworkError("Hosted server id is missing.");
    }

    if (!isHosted && !this.apiKey) {
      throw new ShlinkNetworkError("Shlink API key is missing.");
    }

    const url = isHosted
      ? `/api/hosted/shlink/${encodeURIComponent(this.serverId!)}${path}${buildQueryString(
          options.query
        )}`
      : `${this.baseUrl}/rest/v3${path}${buildQueryString(options.query)}`;

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(isHosted ? {} : { "X-Api-Key": this.apiKey! })
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      return await parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ShlinkApiError) {
        throw error;
      }

      throw new ShlinkNetworkError();
    }
  }

  health() {
    return this.request<ShlinkHealth>("/health");
  }

  async validateAccess() {
    const [health] = await Promise.all([
      this.health().catch(() => null),
      this.listShortUrls({
        page: 1,
        itemsPerPage: 1
      })
    ]);

    return health ?? {};
  }

  listShortUrls(params: ShortUrlListParams = {}) {
    return this.request<ShlinkShortUrlsResponse>("/short-urls", {
      query: {
        page: params.page ?? 1,
        itemsPerPage: params.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE,
        searchTerm: params.searchTerm,
        tags: params.tags,
        orderBy: params.orderBy,
        startDate: params.startDate,
        endDate: params.endDate
      }
    });
  }

  createShortUrl(input: ShlinkCreateShortUrlInput) {
    return this.request<ShlinkShortUrl>("/short-urls", {
      method: "POST",
      body: {
        longUrl: input.longUrl,
        customSlug: input.customSlug || undefined,
        title: input.title || undefined,
        tags: input.tags?.filter(Boolean),
        validSince: input.validSince || undefined,
        validUntil: input.validUntil || undefined,
        domain: input.domain || undefined,
        crawlable: input.crawlable,
        forwardQuery: input.forwardQuery,
        linkConsole: input.linkConsole
      }
    });
  }

  editShortUrl(shortUrl: ShlinkShortUrl, input: ShlinkEditShortUrlInput) {
    return this.request<ShlinkShortUrl>(
      `/short-urls/${encodeURIComponent(getShortUrlIdentifier(shortUrl))}`,
      {
        method: "PATCH",
        query: getDomainQuery(shortUrl),
        body: {
          longUrl: input.longUrl || undefined,
          title: input.title || undefined,
          tags: input.tags,
          validSince: input.validSince || undefined,
          validUntil: input.validUntil || undefined
        }
      }
    );
  }

  deleteShortUrl(shortUrl: ShlinkShortUrl) {
    return this.request<void>(
      `/short-urls/${encodeURIComponent(getShortUrlIdentifier(shortUrl))}`,
      {
        method: "DELETE",
        query: getDomainQuery(shortUrl)
      }
    );
  }

  listTags() {
    return this.request<ShlinkTagsResponse>("/tags");
  }

  renameTag(oldName: string, newName: string) {
    return this.request<void>(`/tags/${encodeURIComponent(oldName)}`, {
      method: "PATCH",
      body: {
        name: newName
      }
    });
  }

  deleteTag(tag: string) {
    return this.request<void>(`/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE"
    });
  }

  listShortUrlVisits(shortUrl: ShlinkShortUrl, params: VisitsParams = {}) {
    return this.request<ShlinkVisitsResponse>(
      `/short-urls/${encodeURIComponent(getShortUrlIdentifier(shortUrl))}/visits`,
      {
        query: {
          ...getDomainQuery(shortUrl),
          page: params.page ?? 1,
          itemsPerPage: params.itemsPerPage ?? 100,
          startDate: params.startDate,
          endDate: params.endDate
        }
      }
    );
  }

  listTagVisits(tag: string, params: VisitsParams = {}) {
    return this.request<ShlinkVisitsResponse>(`/tags/${encodeURIComponent(tag)}/visits`, {
      query: {
        page: params.page ?? 1,
        itemsPerPage: params.itemsPerPage ?? 100,
        startDate: params.startDate,
        endDate: params.endDate
      }
    });
  }

  listGlobalVisits(params: VisitsParams = {}) {
    const query = {
      page: params.page ?? 1,
      itemsPerPage: params.itemsPerPage ?? 100,
      startDate: params.startDate,
      endDate: params.endDate
    };

    return this.request<ShlinkVisitsResponse>("/visits/non-orphan", {
      query
    }).catch((error) => {
      if (error instanceof ShlinkApiError && error.status >= 500) {
        return emptyVisitsResponse(
          error.detail || "",
          query.itemsPerPage,
          error.detail ? undefined : "errors.globalVisits500"
        );
      }

      throw error;
    });
  }
}

export function createShlinkClient(credentials: ShlinkClientCredentials) {
  return new ShlinkClient(credentials);
}
