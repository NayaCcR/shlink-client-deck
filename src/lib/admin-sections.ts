import type { AppView } from "@/components/app/app-shell";

/**
 * 控制台「段」的地址栏约定，与 NyaGallery 的 admin-sections.ts 保持一致：
 *
 *   /admin                      默认段（overview），不带参数
 *   /admin?section=short-urls   其余段
 *
 * 这样刷新、前进后退、把地址发给别人，都能回到同一个页面。
 */
export type AdminSection = AppView;

export const ADMIN_SECTION_PATH = "/admin";

export const DEFAULT_ADMIN_SECTION: AdminSection = "overview";

export const ADMIN_SECTION_ORDER: AdminSection[] = [
  "overview",
  "short-urls",
  "visits",
  "tags",
  "servers",
  "settings"
];

export function isAdminSection(value: string | null | undefined): value is AdminSection {
  return Boolean(value && (ADMIN_SECTION_ORDER as string[]).includes(value));
}

/** 缺失或非法的 ?section= 一律回落到默认段。 */
export function normalizeAdminSection(value: string | null | undefined): AdminSection {
  return isAdminSection(value) ? value : DEFAULT_ADMIN_SECTION;
}

/** 默认段省略参数，其余段带 ?section=。 */
export function getAdminSectionHref(section: AdminSection): string {
  return section === DEFAULT_ADMIN_SECTION
    ? ADMIN_SECTION_PATH
    : `${ADMIN_SECTION_PATH}?section=${section}`;
}

/** 静态导出开启了 trailingSlash，比较路径前先去掉尾斜杠。 */
export function isAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }
  return pathname.replace(/\/+$/, "") === ADMIN_SECTION_PATH;
}
