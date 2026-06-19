"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createShlinkClient } from "@/lib/shlink/client";
import type { ShlinkServer } from "@/lib/shlink/types";

export function useTags(server: ShlinkServer | null) {
  return useQuery({
    queryKey: ["shlink", server?.id, "tags"],
    queryFn: () => createShlinkClient(server!).listTags(),
    enabled: Boolean(server),
    staleTime: 60_000
  });
}

export function useRenameTag(server: ShlinkServer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      createShlinkClient(server!).renameTag(oldName, newName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id]
      });
    }
  });
}

export function useDeleteTag(server: ShlinkServer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tag: string) => createShlinkClient(server!).deleteTag(tag),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["shlink", server?.id]
      });
    }
  });
}
