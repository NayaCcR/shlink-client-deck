export type AuthView = "login" | "register";

export const AUTH_VIEW_LOGIN = "login";
export const AUTH_VIEW_REGISTER = "register";
export const DEFAULT_AUTH_VIEW: AuthView = "login";
export const AUTH_PATH = "/";

/**
 * 从查询参数里读出登录 / 注册视图。
 *
 * 约定是「参数在不在」而不是取值：地址写作 /?login 与 /?register，都是裸参数。
 * 两个同时出现时以 register 为准；都没有则返回 null，由调用方决定默认值。
 */
export function normalizeAuthView(
  search: URLSearchParams | null | undefined
): AuthView | null {
  if (!search) {
    return null;
  }

  if (search.has(AUTH_VIEW_REGISTER)) {
    return "register";
  }

  if (search.has(AUTH_VIEW_LOGIN)) {
    return "login";
  }

  return null;
}

/** 拼出 /?login 或 /?register（裸参数，不带等号）。 */
export function getAuthHref(view: AuthView, inviteCode?: string | null) {
  const param = view === "register" ? AUTH_VIEW_REGISTER : AUTH_VIEW_LOGIN;
  const base = `${AUTH_PATH}?${param}`;

  return inviteCode ? `${base}&invite=${encodeURIComponent(inviteCode)}` : base;
}
