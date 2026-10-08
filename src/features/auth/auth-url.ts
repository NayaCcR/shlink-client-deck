"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  DEFAULT_AUTH_VIEW,
  getAuthHref,
  normalizeAuthView,
  type AuthView
} from "@/lib/auth-routes";

/**
 * 未登录时的地址栏同步。
 *
 *   /?login      登录页
 *   /?register   注册页
 *
 * 直接访问 / 或 /admin（以及带 ?invite= 的邀请链接）时，都会补成规范的
 * /?login 或 /?register，让地址栏始终明确当前停在哪个页面。
 */
export function useAuthRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const inviteCode = searchParams?.get("invite") ?? null;
  // 带邀请码进来时默认落在注册页，否则默认登录页。
  const view =
    normalizeAuthView(searchParams) ?? (inviteCode ? "register" : DEFAULT_AUTH_VIEW);

  React.useEffect(() => {
    // 已经停在 / 且地址里有明确视图时不用动。
    if (pathname === "/" && normalizeAuthView(searchParams)) {
      return;
    }

    if (pathname === "/" || pathname === "/admin") {
      router.replace(getAuthHref(view, inviteCode), { scroll: false });
    }
  }, [inviteCode, pathname, router, searchParams, view]);

  const setView = React.useCallback(
    (next: AuthView) => {
      router.replace(getAuthHref(next, inviteCode), { scroll: false });
    },
    [inviteCode, router]
  );

  return { view, inviteCode, setView };
}
