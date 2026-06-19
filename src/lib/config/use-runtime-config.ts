"use client";

import { useQuery } from "@tanstack/react-query";

import { fallbackRuntimeConfig, loadRuntimeConfig } from "@/lib/config/runtime-config";

export function useRuntimeConfig() {
  return useQuery({
    queryKey: ["runtime-config"],
    queryFn: loadRuntimeConfig,
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: fallbackRuntimeConfig
  });
}
