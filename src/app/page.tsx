"use client";

import { ConsoleApp } from "@/components/app/console-app";
import { HostedConsole } from "@/features/auth/hosted-console";
import { ServerOnboarding } from "@/features/servers/server-onboarding";
import { useServerStore } from "@/features/servers/server-store";
import { isHostedAppMode } from "@/lib/config/app-mode";

function StaticConsole() {
  const hydrated = useServerStore((state) => state.hydrated);
  const servers = useServerStore((state) => state.servers);

  if (!hydrated) {
    return null;
  }

  if (servers.length === 0) {
    return <ServerOnboarding />;
  }

  return <ConsoleApp mode="static" />;
}

export default function HomePage() {
  return isHostedAppMode() ? <HostedConsole /> : <StaticConsole />;
}
