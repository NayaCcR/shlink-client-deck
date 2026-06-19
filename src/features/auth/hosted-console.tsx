"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ConsoleApp } from "@/components/app/console-app";
import { HostedAuthPage } from "@/features/auth/hosted-auth-page";
import { useHostedServers, useHostedSession } from "@/features/auth/hosted-hooks";
import { ServerOnboarding } from "@/features/servers/server-onboarding";
import { useServerStore } from "@/features/servers/server-store";

function HostedLoading() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/25 text-foreground">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {t("hosted.loading")}
      </div>
    </main>
  );
}

export function HostedConsole() {
  const sessionQuery = useHostedSession();
  const session = sessionQuery.data?.session ?? null;
  const workspace = session?.workspaces[0] ?? null;
  const workspaceId = workspace?.id ?? null;
  const serversQuery = useHostedServers(workspaceId);
  const syncHostedServers = useServerStore((state) => state.syncHostedServers);
  const servers = useServerStore((state) => state.servers);

  React.useEffect(() => {
    if (serversQuery.data?.servers) {
      syncHostedServers(serversQuery.data.servers);
    }
  }, [serversQuery.data?.servers, syncHostedServers]);

  if (sessionQuery.isLoading) {
    return <HostedLoading />;
  }

  if (!session) {
    return <HostedAuthPage />;
  }

  if (serversQuery.isLoading) {
    return <HostedLoading />;
  }

  if (servers.length === 0) {
    return <ServerOnboarding mode="hosted" workspaceId={workspaceId} />;
  }

  return (
    <ConsoleApp
      mode="hosted"
      workspaceId={workspaceId}
      workspaceRole={workspace?.role}
      currentUserId={session.user.id}
    />
  );
}
