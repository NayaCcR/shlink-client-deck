"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createShlinkClient } from "@/lib/shlink/client";
import type {
  ShlinkCreateShortUrlInput,
  ShlinkEditShortUrlInput,
  ShlinkServer,
  ShlinkShortUrl,
  ShortUrlListParams
} from "@/lib/shlink/types";

const shortUrlsKey = (serverId?: string, params?: ShortUrlListParams) => [
  "shlink",
  serverId,
  "short-urls",
  params
];

export function useShortUrls(server: ShlinkServer | null, params: ShortUrlListParams = {}) {
  return useQuery({
    queryKey: shortUrlsKey(server?.id, params),
    queryFn: () => createShlinkClient(server!).listShortUrls(params),
    enabled: Boolean(server),
    placeholderData: (previous) => previous,
    staleTime: 30_000
  });
}

export function useAllShortUrls(server: ShlinkServer | null) {
  return useQuery({
    queryKey: ["shlink", server?.id, "short-urls", "all"],
    queryFn: async () => {
      const first = await createShlinkClient(server!).listShortUrls({
        page: 1,
        itemsPerPage: 100
      });
      const totalPages = first.shortUrls.pagination.pagesCount;

      if (totalPages <= 1) {
        return first.shortUrls.data;
      }

      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          createShlinkClient(server!).listShortUrls({
            page: index + 2,
            itemsPerPage: 100
          })
        )
      );

      return [
        ...first.shortUrls.data,
        ...rest.flatMap((page) => page.shortUrls.data)
      ];
    },
    enabled: Boolean(server),
    staleTime: 45_000
  });
}

export function useCreateShortUrl(server: ShlinkServer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ShlinkCreateShortUrlInput) =>
      createShlinkClient(server!).createShortUrl(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "short-urls"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "tags"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "visits"]
      });
    }
  });
}

export function useEditShortUrl(server: ShlinkServer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shortUrl,
      input
    }: {
      shortUrl: ShlinkShortUrl;
      input: ShlinkEditShortUrlInput;
    }) => createShlinkClient(server!).editShortUrl(shortUrl, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "short-urls"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "tags"]
      });
    }
  });
}

export function useDeleteShortUrl(server: ShlinkServer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shortUrl: ShlinkShortUrl) =>
      createShlinkClient(server!).deleteShortUrl(shortUrl),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "short-urls"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "tags"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id, "visits"]
      });
    }
  });
}
