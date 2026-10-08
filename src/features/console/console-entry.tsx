"use client";

import { HostedConsole } from "@/features/auth/hosted-console";
import { StaticConsole } from "@/features/console/static-console";
import { isHostedAppMode } from "@/lib/config/app-mode";

/**
 * "/" 与 "/admin" 共用同一个入口组件：
 * 未登录时渲染登录 / 注册页，登录后由 useConsoleSection 把地址替换为 /admin。
 */
export function ConsoleEntry() {
  return isHostedAppMode() ? <HostedConsole /> : <StaticConsole />;
}
