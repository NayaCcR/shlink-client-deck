"use client";

import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Server,
  ShieldAlert,
  Trash2
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusCallout } from "@/components/ui/status-callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { useDeleteHostedServer } from "@/features/auth/hosted-hooks";
import { ServerFormDialog } from "@/features/servers/server-form-dialog";
import { useTestSavedServerConnection } from "@/features/servers/server-hooks";
import {
  ExportConfigButton,
  ImportConfigButton
} from "@/features/servers/local-config-actions";
import { useServerStore } from "@/features/servers/server-store";
import { isHostedAppMode } from "@/lib/config/app-mode";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";
import { formatDateTime, maskSecret } from "@/lib/utils";

function TestConnectionButton({ server }: { server: ShlinkServer }) {
  const { t } = useTranslation();
  const mutation = useTestSavedServerConnection();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void mutation.mutateAsync(server).catch(() => undefined);
      }}
      disabled={mutation.isPending}
      title={mutation.isError ? getShlinkErrorMessage(mutation.error, t) : undefined}
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : mutation.isSuccess ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : null}
      {t("actions.test")}
    </Button>
  );
}

function DeleteServerButton({
  server,
  mode,
  workspaceId
}: {
  server: ShlinkServer;
  mode: "static" | "hosted";
  workspaceId?: string | null;
}) {
  const { t } = useTranslation();
  const deleteServer = useServerStore((state) => state.deleteServer);
  const deleteHosted = useDeleteHostedServer(workspaceId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("servers.deleteTooltip")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("servers.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "hosted"
              ? t("servers.hostedDeleteDescription")
              : t("servers.deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (mode === "hosted") {
                void deleteHosted.mutateAsync(server.id);
              } else {
                deleteServer(server.id);
              }
            }}
          >
            {t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ServersPage({
  mode = isHostedAppMode() ? "hosted" : "static",
  workspaceId
}: {
  mode?: "static" | "hosted";
  workspaceId?: string | null;
} = {}) {
  const { t, i18n } = useTranslation();
  const servers = useServerStore((state) => state.servers);
  const currentServerId = useServerStore((state) => state.currentServerId);
  const setCurrentServerId = useServerStore((state) => state.setCurrentServerId);

  return (
    <div>
      <PageHeader
        icon={Server}
        title={t("servers.title")}
        description={mode === "hosted" ? t("servers.hostedDescription") : t("servers.description")}
        actions={
          <>
            {mode === "static" ? (
              <>
                <ImportConfigButton />
                <ExportConfigButton />
              </>
            ) : null}
            <ServerFormDialog
              mode={mode}
              workspaceId={workspaceId}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("servers.add")}
                </Button>
              }
            />
          </>
        }
      />

      <StatusCallout
        icon={ShieldAlert}
        title={mode === "hosted" ? t("servers.hostedStorageTitle") : t("servers.storageTitle")}
        tone={mode === "hosted" ? "success" : "warning"}
        className="mb-5"
      >
        {mode === "hosted" ? t("servers.hostedStorageDescription") : t("servers.storageDescription")}
      </StatusCallout>

      {servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title={t("servers.emptyTitle")}
          description={t("servers.emptyDescription")}
          action={
            <ServerFormDialog
              mode={mode}
              workspaceId={workspaceId}
              trigger={<Button>{t("servers.add")}</Button>}
            />
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("servers.table.name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("servers.table.baseUrl")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("servers.table.apiKey")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("servers.table.updatedAt")}</TableHead>
                <TableHead className="w-[220px] text-right">{t("servers.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{server.name}</span>
                      {server.id === currentServerId ? <Badge>{t("layout.current")}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{server.baseUrl}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <code className="rounded-md bg-secondary px-2 py-1 text-xs">
                      {server.apiKeyPreview ?? maskSecret(server.apiKey, t("common.notSet"))}
                    </code>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(server.updatedAt, i18n.language, t("common.unknown"))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {server.id !== currentServerId ? (
                        <Button variant="outline" size="sm" onClick={() => setCurrentServerId(server.id)}>
                          {t("actions.setCurrent")}
                        </Button>
                      ) : null}
                      <TestConnectionButton server={server} />
                      <ServerFormDialog
                        server={server}
                        mode={mode}
                        workspaceId={workspaceId}
                        trigger={
                          <Button variant="ghost" size="icon" title={t("servers.editTooltip")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DeleteServerButton
                        server={server}
                        mode={mode}
                        workspaceId={workspaceId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
