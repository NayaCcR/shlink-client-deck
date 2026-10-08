"use client";

import { ConsoleApp } from "@/components/app/console-app";
import { useConsoleSection } from "@/features/console/console-url";
import { ServerOnboarding } from "@/features/servers/server-onboarding";
import { useServerStore } from "@/features/servers/server-store";

export function StaticConsole() {
  const hydrated = useServerStore((state) => state.hydrated);
  const servers = useServerStore((state) => state.servers);
  const { section, onSectionChange } = useConsoleSection(hydrated && servers.length > 0);

  if (!hydrated) {
    return null;
  }

  if (servers.length === 0) {
    return <ServerOnboarding />;
  }

  return <ConsoleApp mode="static" section={section} onSectionChange={onSectionChange} />;
}
