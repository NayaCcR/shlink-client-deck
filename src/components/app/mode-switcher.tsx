"use client";

import { ChevronDown, ExternalLink, MonitorSmartphone, ServerCog } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useRuntimeConfig } from "@/lib/config/use-runtime-config";

type ModeSwitcherProps = {
  mode: "static" | "hosted";
};

export function ModeSwitcher({ mode }: ModeSwitcherProps) {
  const { t } = useTranslation();
  const { data: config } = useRuntimeConfig();
  const isHosted = mode === "hosted";
  const hostedUrl = config?.allowHostedMode ? config.hostedModeUrl : null;
  const staticUrl = config?.officialSite || "https://link.31n.cc";
  const targetUrl = isHosted ? staticUrl : hostedUrl;
  const CurrentIcon = isHosted ? ServerCog : MonitorSmartphone;
  const targetLabel = isHosted ? t("modeSwitcher.openStatic") : t("modeSwitcher.openHosted");
  const unavailableLabel = isHosted
    ? t("modeSwitcher.staticUnavailable")
    : t("modeSwitcher.hostedUnavailable");

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-auto gap-3 rounded-lg border-border bg-background/90 px-3 py-2 text-left shadow-lg backdrop-blur"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CurrentIcon className="h-4 w-4" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-xs font-semibold">
                {isHosted ? t("modeSwitcher.hostedLabel") : t("modeSwitcher.staticLabel")}
              </span>
              <span className="block max-w-44 truncate text-[11px] text-muted-foreground">
                {isHosted ? t("modeSwitcher.hostedDescription") : t("modeSwitcher.staticDescription")}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-72 p-2">
          <DropdownMenuLabel>{t("modeSwitcher.title")}</DropdownMenuLabel>
          <div className="rounded-md bg-muted/50 p-3 text-xs leading-5">
            <p className="font-medium">
              {isHosted ? t("modeSwitcher.hostedLabel") : t("modeSwitcher.staticLabel")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {isHosted ? t("modeSwitcher.hostedDescription") : t("modeSwitcher.staticDescription")}
            </p>
          </div>
          <DropdownMenuSeparator />
          {targetUrl ? (
            <DropdownMenuItem asChild className="cursor-pointer">
              <a href={targetUrl} className="flex w-full items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <span>{targetLabel}</span>
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <ExternalLink className="h-4 w-4" />
              <span>{unavailableLabel}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
