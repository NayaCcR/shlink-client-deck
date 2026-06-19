import { requireHostedSession } from "@/lib/hosted/auth";
import { decryptSecret } from "@/lib/hosted/crypto";
import { roleCanCreateShortUrls, roleCanSeeWorkspaceOverview } from "@/lib/hosted/permissions";
import { apiError, noStoreJson } from "@/lib/hosted/responses";
import { hostedStore } from "@/lib/hosted/store";
import type { HostedServerRecord, HostedWorkspaceMemberRecord } from "@/lib/hosted/types";
import type {
  ShlinkPagination,
  ShlinkShortUrl,
  ShlinkShortUrlsResponse,
  ShlinkTagsResponse,
  ShlinkVisit,
  ShlinkVisitsResponse
} from "@/lib/shlink/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    serverId: string;
    path: string[];
  }>;
};

type HostedAccess = {
  server: HostedServerRecord;
  member: HostedWorkspaceMemberRecord;
};

const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;
const SHORT_URL_PAGE_SIZE = 100;
const VISITS_PAGE_SIZE = 1000;

function makeUpstreamUrl(baseUrl: string, segments: string[], search?: URLSearchParams) {
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const query = search?.toString();
  return `${baseUrl}/rest/v3/${path}${query ? `?${query}` : ""}`;
}

function makeSearch(requestUrl: string) {
  return new URL(requestUrl).searchParams;
}

function cloneSearch(search: URLSearchParams) {
  return new URLSearchParams(search.toString());
}

function normalizeDomain(domain?: string | null) {
  const value = domain?.trim();
  return value ? value : null;
}

function shortUrlKey(shortUrl: Pick<ShlinkShortUrl, "shortCode" | "domain">) {
  return `${normalizeDomain(shortUrl.domain) ?? ""}\u0000${shortUrl.shortCode}`;
}

function recordKey(record: { shortCode: string; domain?: string | null }) {
  return `${normalizeDomain(record.domain) ?? ""}\u0000${record.shortCode}`;
}

function pagination(page: number, itemsPerPage: number, totalItems: number): ShlinkPagination {
  const pagesCount = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const itemsInCurrentPage = Math.max(0, Math.min(itemsPerPage, totalItems - start));

  return {
    currentPage: page,
    pagesCount,
    itemsPerPage,
    itemsInCurrentPage,
    totalItems
  };
}

function paginate<T>(items: T[], search: URLSearchParams) {
  const page = Math.max(1, Number(search.get("page") || "1") || 1);
  const itemsPerPage = Math.max(1, Number(search.get("itemsPerPage") || "20") || 20);
  const start = (page - 1) * itemsPerPage;
  return {
    data: items.slice(start, start + itemsPerPage),
    pagination: pagination(page, itemsPerPage, items.length)
  };
}

function emptyVisits(search: URLSearchParams): ShlinkVisitsResponse {
  const page = Math.max(1, Number(search.get("page") || "1") || 1);
  const itemsPerPage = Math.max(1, Number(search.get("itemsPerPage") || "100") || 100);
  return {
    visits: {
      data: [],
      pagination: {
        currentPage: page,
        pagesCount: 1,
        itemsPerPage,
        itemsInCurrentPage: 0,
        totalItems: 0
      }
    }
  };
}

async function fetchUpstream(
  access: HostedAccess,
  apiKey: string,
  segments: string[],
  init: {
    method?: string;
    search?: URLSearchParams;
    body?: string;
    contentType?: string | null;
  } = {}
) {
  return fetch(makeUpstreamUrl(access.server.baseUrl, segments, init.search), {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json, application/health+json",
      "Content-Type": init.contentType || "application/json",
      "X-Api-Key": apiKey
    },
    body: init.body
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

async function responseFromUpstream(response: Response) {
  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  const requestId = response.headers.get("x-request-id");
  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  }
  if (requestId) {
    responseHeaders.set("X-Request-Id", requestId);
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(await response.text(), {
    status: response.status,
    headers: responseHeaders
  });
}

async function fetchAllShortUrls(access: HostedAccess, apiKey: string, search: URLSearchParams) {
  const firstSearch = cloneSearch(search);
  firstSearch.set("page", "1");
  firstSearch.set("itemsPerPage", String(SHORT_URL_PAGE_SIZE));

  const firstResponse = await fetchUpstream(access, apiKey, ["short-urls"], {
    search: firstSearch
  });
  if (!firstResponse.ok) {
    return { response: await responseFromUpstream(firstResponse) };
  }

  const first = await readJson<ShlinkShortUrlsResponse>(firstResponse);
  const totalPages = first.shortUrls.pagination.pagesCount;
  const urls = [...first.shortUrls.data];

  for (let page = 2; page <= totalPages; page += 1) {
    const pageSearch = cloneSearch(firstSearch);
    pageSearch.set("page", String(page));
    const response = await fetchUpstream(access, apiKey, ["short-urls"], {
      search: pageSearch
    });
    if (!response.ok) {
      return { response: await responseFromUpstream(response) };
    }

    const payload = await readJson<ShlinkShortUrlsResponse>(response);
    urls.push(...payload.shortUrls.data);
  }

  return { urls };
}

async function listVisibleShortUrls(
  access: HostedAccess,
  userId: string,
  apiKey: string,
  search: URLSearchParams
) {
  const visible = await hostedStore.listVisibleShortUrlRecords(userId, access.server.id);
  if (!visible) {
    return { response: apiError("NOT_FOUND", "Server not found.", 404) };
  }

  const allowedKeys = new Set(visible.records.map(recordKey));
  if (allowedKeys.size === 0) {
    return { urls: [] };
  }

  const fetched = await fetchAllShortUrls(access, apiKey, search);
  if ("response" in fetched) {
    return fetched;
  }

  return {
    urls: fetched.urls.filter((shortUrl) => allowedKeys.has(shortUrlKey(shortUrl)))
  };
}

async function fetchShortUrlVisits(
  access: HostedAccess,
  apiKey: string,
  shortUrl: ShlinkShortUrl,
  sourceSearch: URLSearchParams
) {
  const search = cloneSearch(sourceSearch);
  search.set("page", "1");
  search.set("itemsPerPage", String(VISITS_PAGE_SIZE));
  if (shortUrl.domain) {
    search.set("domain", shortUrl.domain);
  } else {
    search.delete("domain");
  }

  const response = await fetchUpstream(
    access,
    apiKey,
    ["short-urls", shortUrl.shortCode, "visits"],
    { search }
  );
  if (!response.ok) {
    return { response: await responseFromUpstream(response) };
  }

  const first = await readJson<ShlinkVisitsResponse>(response);
  const visits = [...first.visits.data];
  const totalPages = first.visits.pagination.pagesCount;

  for (let page = 2; page <= totalPages; page += 1) {
    const pageSearch = cloneSearch(search);
    pageSearch.set("page", String(page));
    const pageResponse = await fetchUpstream(
      access,
      apiKey,
      ["short-urls", shortUrl.shortCode, "visits"],
      { search: pageSearch }
    );
    if (!pageResponse.ok) {
      return { response: await responseFromUpstream(pageResponse) };
    }

    const payload = await readJson<ShlinkVisitsResponse>(pageResponse);
    visits.push(...payload.visits.data);
  }

  return { visits };
}

async function aggregateVisitsForShortUrls(
  access: HostedAccess,
  apiKey: string,
  shortUrls: ShlinkShortUrl[],
  search: URLSearchParams
) {
  if (shortUrls.length === 0) {
    return emptyVisits(search);
  }

  const visits: ShlinkVisit[] = [];
  for (const shortUrl of shortUrls) {
    const result = await fetchShortUrlVisits(access, apiKey, shortUrl, search);
    if ("response" in result) {
      return result;
    }

    visits.push(...result.visits);
  }

  visits.sort((a, b) => {
    const left = a.date ? new Date(a.date).getTime() : 0;
    const right = b.date ? new Date(b.date).getTime() : 0;
    return right - left;
  });

  const paginated = paginate(visits, search);
  return {
    visits: paginated
  } satisfies ShlinkVisitsResponse;
}

async function handleHostedShortUrls(
  request: Request,
  access: HostedAccess,
  userId: string,
  apiKey: string,
  path: string[]
) {
  if (path[0] !== "short-urls") {
    return null;
  }

  const method = request.method.toUpperCase();
  const search = makeSearch(request.url);
  const canSeeAll = roleCanSeeWorkspaceOverview(access.member.role);

  if (path.length === 1 && method === "GET") {
    if (canSeeAll) {
      return responseFromUpstream(
        await fetchUpstream(access, apiKey, path, {
          search
        })
      );
    }

    const result = await listVisibleShortUrls(access, userId, apiKey, search);
    if ("response" in result) {
      return result.response;
    }

    const paginated = paginate(result.urls, search);
    return noStoreJson({
      shortUrls: paginated
    } satisfies ShlinkShortUrlsResponse);
  }

  if (path.length === 1 && method === "POST") {
    if (!roleCanCreateShortUrls(access.member.role)) {
      return apiError("FORBIDDEN", "You cannot create short URLs in this workspace.", 403);
    }

    const response = await fetchUpstream(access, apiKey, path, {
      method,
      search,
      body: await request.text(),
      contentType: request.headers.get("content-type")
    });
    if (!response.ok) {
      return responseFromUpstream(response);
    }

    const shortUrl = await readJson<ShlinkShortUrl>(response);
    await hostedStore.upsertShortUrlRecord(userId, {
      serverId: access.server.id,
      shortCode: shortUrl.shortCode,
      domain: shortUrl.domain,
      shortUrl: shortUrl.shortUrl
    });

    return noStoreJson(shortUrl, { status: response.status });
  }

  if (path.length === 2 && (method === "PATCH" || method === "DELETE")) {
    const shortCode = path[1];
    const domain = search.get("domain");
    const shortUrlAccess = await hostedStore.getShortUrlAccessForUser(userId, {
      serverId: access.server.id,
      shortCode,
      domain: domain ?? undefined
    });

    if (!shortUrlAccess?.canManage) {
      return apiError("FORBIDDEN", "You cannot manage this short URL.", 403);
    }

    const response = await fetchUpstream(access, apiKey, path, {
      method,
      search,
      body: method === "PATCH" ? await request.text() : undefined,
      contentType: request.headers.get("content-type")
    });
    if (!response.ok) {
      return responseFromUpstream(response);
    }

    if (method === "DELETE") {
      await hostedStore.deleteShortUrlRecord(userId, {
        serverId: access.server.id,
        shortCode,
        domain: domain ?? undefined
      });
    }

    return responseFromUpstream(response);
  }

  if (path.length === 3 && path[2] === "visits" && method === "GET") {
    if (!canSeeAll) {
      const shortUrlAccess = await hostedStore.getShortUrlAccessForUser(userId, {
        serverId: access.server.id,
        shortCode: path[1],
        domain: search.get("domain") ?? undefined
      });
      if (!shortUrlAccess?.canRead) {
        return apiError("FORBIDDEN", "You cannot view visits for this short URL.", 403);
      }
    }

    return responseFromUpstream(
      await fetchUpstream(access, apiKey, path, {
        search
      })
    );
  }

  if (path[0] === "short-urls" && path.length >= 2 && !canSeeAll) {
    const shortUrlAccess = await hostedStore.getShortUrlAccessForUser(userId, {
      serverId: access.server.id,
      shortCode: path[1],
      domain: search.get("domain") ?? undefined
    });
    const allowed = method === "GET" ? shortUrlAccess?.canRead : shortUrlAccess?.canManage;
    if (!allowed) {
      return apiError("FORBIDDEN", "You cannot access this short URL.", 403);
    }

    const hasBody = method !== "GET" && method !== "DELETE";
    return responseFromUpstream(
      await fetchUpstream(access, apiKey, path, {
        method,
        search,
        body: hasBody ? await request.text() : undefined,
        contentType: request.headers.get("content-type")
      })
    );
  }

  return null;
}

async function handleHostedVisits(
  request: Request,
  access: HostedAccess,
  userId: string,
  apiKey: string,
  path: string[]
) {
  const method = request.method.toUpperCase();
  const canSeeAll = roleCanSeeWorkspaceOverview(access.member.role);
  if (path[0] === "visits" && !canSeeAll && (path.length !== 2 || path[1] !== "non-orphan")) {
    return apiError("FORBIDDEN", "Only workspace admins can view global visit resources.", 403);
  }

  if (method !== "GET" || path.length !== 2 || path[0] !== "visits" || path[1] !== "non-orphan") {
    return null;
  }

  const search = makeSearch(request.url);
  if (canSeeAll) {
    return responseFromUpstream(
      await fetchUpstream(access, apiKey, path, {
        search
      })
    );
  }

  const result = await listVisibleShortUrls(access, userId, apiKey, new URLSearchParams());
  if ("response" in result) {
    return result.response;
  }

  const visits = await aggregateVisitsForShortUrls(access, apiKey, result.urls, search);
  if ("response" in visits) {
    return visits.response;
  }

  return noStoreJson(visits);
}

async function handleHostedTags(
  request: Request,
  access: HostedAccess,
  userId: string,
  apiKey: string,
  path: string[]
) {
  const method = request.method.toUpperCase();
  const search = makeSearch(request.url);
  const canSeeAll = roleCanSeeWorkspaceOverview(access.member.role);

  if (canSeeAll) {
    return null;
  }

  if (path.length === 1 && path[0] === "tags" && method === "GET") {
    const result = await listVisibleShortUrls(access, userId, apiKey, new URLSearchParams());
    if ("response" in result) {
      return result.response;
    }

    const tags = Array.from(
      new Set(result.urls.flatMap((shortUrl) => shortUrl.tags ?? []).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return noStoreJson({
      tags: {
        data: tags
      }
    } satisfies ShlinkTagsResponse);
  }

  if (path.length === 3 && path[0] === "tags" && path[2] === "visits" && method === "GET") {
    const tag = path[1];
    const result = await listVisibleShortUrls(access, userId, apiKey, new URLSearchParams());
    if ("response" in result) {
      return result.response;
    }

    const taggedShortUrls = result.urls.filter((shortUrl) => shortUrl.tags?.includes(tag));
    const visits = await aggregateVisitsForShortUrls(access, apiKey, taggedShortUrls, search);
    if ("response" in visits) {
      return visits.response;
    }

    return noStoreJson(visits);
  }

  if (path[0] === "tags" && (method === "PATCH" || method === "DELETE")) {
    return apiError("FORBIDDEN", "Only workspace admins can rename or delete shared tags.", 403);
  }

  return null;
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

  try {
    const shortUrlsResponse = await handleHostedShortUrls(
      request,
      access,
      auth.session.user.id,
      apiKey,
      path
    );
    if (shortUrlsResponse) {
      return shortUrlsResponse;
    }

    const visitsResponse = await handleHostedVisits(
      request,
      access,
      auth.session.user.id,
      apiKey,
      path
    );
    if (visitsResponse) {
      return visitsResponse;
    }

    const tagsResponse = await handleHostedTags(
      request,
      access,
      auth.session.user.id,
      apiKey,
      path
    );
    if (tagsResponse) {
      return tagsResponse;
    }

    if (
      !roleCanSeeWorkspaceOverview(access.member.role) &&
      !(method === "GET" && path.length === 1 && path[0] === "health")
    ) {
      return apiError("FORBIDDEN", "Only workspace admins can access this Shlink resource.", 403);
    }

    const hasBody = method !== "GET" && method !== "DELETE";
    return responseFromUpstream(
      await fetchUpstream(access, apiKey, path, {
        method,
        search: makeSearch(request.url),
        body: hasBody ? await request.text() : undefined,
        contentType: request.headers.get("content-type")
      })
    );
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
