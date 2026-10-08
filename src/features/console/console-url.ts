"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import type { AppView } from "@/components/app/app-shell";
import { getAdminSectionHref, isAdminPath, normalizeAdminSection } from "@/lib/admin-sections";

/**
 * 把控制台当前所在的段同步到地址栏。
 *
 * ready 为 true（也就是真正进入控制台）时，如果地址还停在 "/"，
 * 就替换成规范的 /admin 地址；切换段时同样用 replace，避免刷出一堆历史记录。
 */
export function useConsoleSection(ready: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const section = normalizeAdminSection(searchParams?.get("section"));

  React.useEffect(() => {
    if (!ready || isAdminPath(pathname)) {
      return;
    }
    router.replace(getAdminSectionHref(section), { scroll: false });
  }, [pathname, ready, router, section]);

  const onSectionChange = React.useCallback(
    (next: AppView) => {
      router.replace(getAdminSectionHref(next), { scroll: false });
    },
    [router]
  );

  return { section, onSectionChange };
}
