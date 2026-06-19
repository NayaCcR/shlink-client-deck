"use client";

import * as React from "react";

import { AppShell, type AppView } from "@/components/app/app-shell";
import { OverviewPage } from "@/features/overview/overview-page";
import { ServersPage } from "@/features/servers/servers-page";
import { useCurrentServer } from "@/features/servers/server-store";
import { SettingsPage } from "@/features/settings/settings-page";
import { ShortUrlsPage } from "@/features/short-urls/short-urls-page";
import { TagsPage } from "@/features/tags/tags-page";
import { VisitsPage } from "@/features/visits/visits-page";
import type { HostedRole } from "@/lib/hosted/types";

type ConsoleAppProps = {
  mode?: "static" | "hosted";
  workspaceId?: string | null;
  workspaceRole?: HostedRole | null;
  currentUserId?: string | null;
};

export function ConsoleApp({
  mode = "static",
  workspaceId,
  workspaceRole,
  currentUserId
}: ConsoleAppProps) {
  const currentServer = useCurrentServer();
  const [activeView, setActiveView] = React.useState<AppView>("overview");
  const [globalSearch, setGlobalSearch] = React.useState("");

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      mode={mode}
    >
      {activeView === "overview" ? (
        <OverviewPage
          server={currentServer}
          onNavigateShortUrls={() => setActiveView("short-urls")}
        />
      ) : null}
      {activeView === "short-urls" ? (
        <ShortUrlsPage
          server={currentServer}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
        />
      ) : null}
      {activeView === "visits" ? <VisitsPage server={currentServer} /> : null}
      {activeView === "tags" ? (
        <TagsPage
          server={currentServer}
          onFilterTag={(tag) => {
            setGlobalSearch(tag);
            setActiveView("short-urls");
          }}
        />
      ) : null}
      {activeView === "servers" ? (
        <ServersPage mode={mode} workspaceId={workspaceId} />
      ) : null}
      {activeView === "settings" ? (
        <SettingsPage
          mode={mode}
          workspaceId={workspaceId}
          workspaceRole={workspaceRole}
          currentUserId={currentUserId}
        />
      ) : null}
    </AppShell>
  );
}
