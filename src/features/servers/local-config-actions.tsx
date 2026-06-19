"use client";

import { Download, FileUp, ShieldAlert, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { StatusCallout } from "@/components/ui/status-callout";
import {
  createExportEnvelope,
  downloadJson,
  readJsonFile,
  type LocalConfigEnvelope
} from "@/lib/storage/local-store";
import type { ShlinkServer } from "@/lib/shlink/types";
import { useServerStore } from "@/features/servers/server-store";

type ExportPayload = {
  servers: ShlinkServer[];
  currentServerId: string | null;
};

function isExportPayload(value: unknown): value is LocalConfigEnvelope<ExportPayload> {
  const candidate = value as LocalConfigEnvelope<ExportPayload>;
  return (
    candidate?.version === 1 &&
    Array.isArray(candidate?.payload?.servers) &&
    "currentServerId" in candidate.payload
  );
}

export function ExportConfigButton() {
  const { t } = useTranslation();
  const servers = useServerStore((state) => state.servers);
  const currentServerId = useServerStore((state) => state.currentServerId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          {t("servers.export.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("servers.export.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("servers.export.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <StatusCallout icon={ShieldAlert} title={t("servers.export.warningTitle")} tone="warning">
          {t("servers.export.warningDescription")}
        </StatusCallout>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              downloadJson(
                `link-console-config-${new Date().toISOString().slice(0, 10)}.json`,
                createExportEnvelope({
                  servers,
                  currentServerId
                })
              );
            }}
          >
            {t("actions.confirmExport")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ImportConfigButton() {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const importServers = useServerStore((state) => state.importServers);
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }

    try {
      const payload = await readJsonFile<unknown>(file);
      if (!isExportPayload(payload)) {
        setError(t("errors.invalidConfigFile"));
        return;
      }

      importServers(payload.payload.servers, payload.payload.currentServerId);
      setError(null);
    } catch {
      setError(t("errors.readConfigFile"));
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <FileUp className="h-4 w-4" />
        {t("servers.import.button")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ClearConfigButton() {
  const { t } = useTranslation();
  const clearServers = useServerStore((state) => state.clearServers);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          {t("servers.clear.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("servers.clear.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("servers.clear.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={clearServers}>{t("actions.confirmClear")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
