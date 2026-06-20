"use client";

import { FileUp, Link2, Server } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ModeSwitcher } from "@/components/app/mode-switcher";
import { Button } from "@/components/ui/button";
import { StatusCallout } from "@/components/ui/status-callout";
import { ServerFormDialog } from "@/features/servers/server-form-dialog";
import { ImportConfigButton } from "@/features/servers/local-config-actions";
import { useRuntimeConfig } from "@/lib/config/use-runtime-config";

export function ServerOnboarding({
  mode = "static",
  workspaceId
}: {
  mode?: "static" | "hosted";
  workspaceId?: string | null;
} = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { data: config } = useRuntimeConfig();

  return (
    <main className="min-h-screen bg-background">
      <ModeSwitcher mode={mode} />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{config?.appName || "Link Console"}</p>
                <p className="text-xs text-muted-foreground">{t("servers.onboarding.subtitle")}</p>
              </div>
            </div>
            <h1 className="mt-8 max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              {t("servers.onboarding.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {mode === "hosted"
                ? t("servers.onboarding.hostedDescription")
                : t("servers.onboarding.description")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ServerFormDialog
                open={open}
                onOpenChange={setOpen}
                mode={mode}
                workspaceId={workspaceId}
                trigger={
                  <Button size="lg">
                    <Server className="h-4 w-4" />
                    {t("servers.add")}
                  </Button>
                }
              />
              {mode === "static" ? <ImportConfigButton /> : null}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <div className="space-y-4">
              <StatusCallout icon={Server} title={t("servers.onboarding.requirementsTitle")} tone="neutral">
                {t("servers.onboarding.requirementsDescription")}
              </StatusCallout>
              <StatusCallout icon={FileUp} title={t("servers.onboarding.multiServerTitle")} tone="success">
                {mode === "hosted"
                  ? t("servers.onboarding.hostedMultiServerDescription")
                  : t("servers.onboarding.multiServerDescription")}
              </StatusCallout>
              <StatusCallout
                title={
                  mode === "hosted"
                    ? t("servers.onboarding.hostedSecurityTitle")
                    : t("servers.onboarding.securityTitle")
                }
                tone={mode === "hosted" ? "success" : "warning"}
              >
                {mode === "hosted"
                  ? t("servers.onboarding.hostedSecurityDescription")
                  : t("servers.onboarding.securityDescription")}
              </StatusCallout>
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-medium">{t("servers.onboarding.examplesTitle")}</p>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <code className="rounded-md bg-secondary px-3 py-2">https://u.31n.cc</code>
                <code className="rounded-md bg-secondary px-3 py-2">https://go.example.com</code>
                <code className="rounded-md bg-secondary px-3 py-2">https://s.example.org</code>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {t("servers.onboarding.examplesDescription")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
