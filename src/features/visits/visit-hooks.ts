"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { createShlinkClient } from "@/lib/shlink/client";
import type { ShlinkServer, ShlinkShortUrl, VisitsParams } from "@/lib/shlink/types";

export function useGlobalVisits(server: ShlinkServer | null, params: VisitsParams = {}) {
  return useQuery({
    queryKey: ["shlink", server?.id, "visits", "global", params],
    queryFn: () => createShlinkClient(server!).listGlobalVisits(params),
    enabled: Boolean(server),
    staleTime: 60_000
  });
}

export function useShortUrlVisits(
  server: ShlinkServer | null,
  shortUrl: ShlinkShortUrl | null,
  params: VisitsParams = {}
) {
  return useQuery({
    queryKey: [
      "shlink",
      server?.id,
      "visits",
      "short-url",
      shortUrl?.shortUrl,
      params
    ],
    queryFn: () => createShlinkClient(server!).listShortUrlVisits(shortUrl!, params),
    enabled: Boolean(server && shortUrl),
    staleTime: 60_000
  });
}

export function useTagVisits(
  server: ShlinkServer | null,
  tag: string | null,
  params: VisitsParams = {}
) {
  return useQuery({
    queryKey: ["shlink", server?.id, "visits", "tag", tag, params],
    queryFn: () => createShlinkClient(server!).listTagVisits(tag!, params),
    enabled: Boolean(server && tag),
    staleTime: 60_000
  });
}

export function useManyTagVisits(
  server: ShlinkServer | null,
  tags: string[],
  params: VisitsParams = {}
) {
  return useQueries({
    queries: tags.slice(0, 20).map((tag) => ({
      queryKey: ["shlink", server?.id, "visits", "tag", tag, params],
      queryFn: () => createShlinkClient(server!).listTagVisits(tag, params),
      enabled: Boolean(server && tag),
      staleTime: 60_000
    }))
  });
}
