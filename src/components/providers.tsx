"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { I18nextProvider } from "react-i18next";

import { i18n, initI18n } from "@/i18n/client";
import { useRuntimeConfig } from "@/lib/config/use-runtime-config";
import { useSettingsStore } from "@/features/settings/settings-store";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        throwOnError: false
      },
      mutations: {
        throwOnError: false
      }
    }
  });
}

function I18nBridge({ children }: { children: React.ReactNode }) {
  const { data: config } = useRuntimeConfig();
  const locale = useSettingsStore((state) => state.locale);
  const activeLocale = locale || config?.defaultLocale || "zh-CN";

  const instance = React.useMemo(() => initI18n(activeLocale), [activeLocale]);
  const [, forceRender] = React.useReducer((value: number) => value + 1, 0);

  React.useEffect(() => {
    const onLanguageChanged = () => forceRender();
    instance.on("languageChanged", onLanguageChanged);
    return () => {
      instance.off("languageChanged", onLanguageChanged);
    };
  }, [instance]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <I18nBridge>{children}</I18nBridge>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
