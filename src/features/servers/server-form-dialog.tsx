"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Server } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusCallout } from "@/components/ui/status-callout";
import {
  useCreateHostedServer,
  useUpdateHostedServer
} from "@/features/auth/hosted-hooks";
import { useTestServerConnection } from "@/features/servers/server-hooks";
import { createServerFormSchema, type ServerFormValues } from "@/features/servers/server-schema";
import { useServerStore } from "@/features/servers/server-store";
import { isHostedAppMode } from "@/lib/config/app-mode";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";

type ServerFormDialogProps = {
  server?: ShlinkServer | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "static" | "hosted";
  workspaceId?: string | null;
};

export function ServerFormDialog({
  server,
  trigger,
  open,
  onOpenChange,
  mode = isHostedAppMode() ? "hosted" : "static",
  workspaceId
}: ServerFormDialogProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const addServer = useServerStore((state) => state.addServer);
  const updateServer = useServerStore((state) => state.updateServer);
  const setCurrentServerId = useServerStore((state) => state.setCurrentServerId);
  const testConnection = useTestServerConnection();
  const createHosted = useCreateHostedServer(workspaceId);
  const updateHosted = useUpdateHostedServer(workspaceId);
  const isHosted = mode === "hosted";
  const apiKeyOptional = isHosted && Boolean(server);
  const formSchema = React.useMemo(
    () => createServerFormSchema(t, { apiKeyOptional }),
    [apiKeyOptional, t]
  );

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: server?.name ?? "",
      baseUrl: server?.baseUrl ?? "",
      apiKey: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (isHosted) {
      if (!workspaceId) {
        return;
      }

      if (server) {
        await updateHosted.mutateAsync({
          serverId: server.id,
          input: {
            name: values.name,
            baseUrl: values.baseUrl,
            apiKey: values.apiKey || undefined
          }
        });
        setCurrentServerId(server.id);
      } else {
        const created = await createHosted.mutateAsync({
          workspaceId,
          name: values.name,
          baseUrl: values.baseUrl,
          apiKey: values.apiKey
        });
        setCurrentServerId(created.server.id);
      }
    } else if (server) {
      updateServer(server.id, values);
      setCurrentServerId(server.id);
    } else {
      const created = addServer(values);
      setCurrentServerId(created.id);
    }
    setOpen(false);
    form.reset();
  });

  const handleTest = form.handleSubmit(async (values) => {
    try {
      await testConnection.mutateAsync({
        serverId: isHosted && server ? server.id : undefined,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey || undefined
      });
    } catch {
      // The mutation state renders the error inside the dialog.
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {server ? t("servers.form.editTitle") : t("servers.form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isHosted ? t("servers.form.hostedDescription") : t("servers.form.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="server-name">{t("fields.serverName")}</Label>
            <Input
              id="server-name"
              placeholder={t("fields.serverNamePlaceholder")}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="server-base-url">{t("fields.serverBaseUrl")}</Label>
            <Input
              id="server-base-url"
              placeholder="https://u.example.com"
              {...form.register("baseUrl")}
            />
            {form.formState.errors.baseUrl ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.baseUrl.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="server-api-key">{t("fields.apiKey")}</Label>
            <Input
              id="server-api-key"
              type="password"
              autoComplete="off"
              placeholder={
                apiKeyOptional
                  ? t("fields.apiKeyKeepPlaceholder")
                  : t("fields.apiKeyPlaceholder")
              }
              {...form.register("apiKey")}
            />
            {form.formState.errors.apiKey ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.apiKey.message}
              </p>
            ) : null}
          </div>

          <StatusCallout
            icon={Server}
            title={
              isHosted
                ? t("servers.form.hostedSecurityTitle")
                : t("servers.form.staticSecurityTitle")
            }
            tone={isHosted ? "success" : "warning"}
          >
            {isHosted
              ? t("servers.form.hostedSecurityDescription")
              : t("servers.form.staticSecurityDescription")}
          </StatusCallout>

          {createHosted.isError || updateHosted.isError ? (
            <StatusCallout title={t("servers.form.saveFailed")} tone="danger">
              {getShlinkErrorMessage(createHosted.error || updateHosted.error, t)}
            </StatusCallout>
          ) : null}

          {testConnection.isError ? (
            <StatusCallout title={t("servers.form.testFailed")} tone="danger">
              {getShlinkErrorMessage(testConnection.error, t)}
            </StatusCallout>
          ) : null}
          {testConnection.isSuccess ? (
            <StatusCallout
              title={
                testConnection.data.shortUrls.ok
                  ? t("servers.form.testSuccess")
                  : t("servers.form.partialSuccess")
              }
              tone={testConnection.data.shortUrls.ok ? "success" : "warning"}
            >
              {testConnection.data.shortUrls.ok
                ? t("servers.form.testSuccessDescription")
                : t("servers.form.partialSuccessDescription", {
                    message: testConnection.data.shortUrls.message
                  })}
            </StatusCallout>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("actions.testConnection")}
            </Button>
            <Button
              type="submit"
              disabled={createHosted.isPending || updateHosted.isPending}
            >
              {createHosted.isPending || updateHosted.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {server ? t("actions.saveChanges") : t("servers.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
