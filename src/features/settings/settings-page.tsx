"use client";

import { Database, Globe2, Moon, Settings, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusCallout } from "@/components/ui/status-callout";
import {
  ClearConfigButton,
  ExportConfigButton,
  ImportConfigButton
} from "@/features/servers/local-config-actions";
import { isHostedAppMode } from "@/lib/config/app-mode";
import { useSettingsStore, type AppTheme } from "@/features/settings/settings-store";
import { useRuntimeConfig } from "@/lib/config/use-runtime-config";

export function SettingsPage() {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const storedTheme = useSettingsStore((state) => state.theme);
  const setStoredTheme = useSettingsStore((state) => state.setTheme);
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const { data: config } = useRuntimeConfig();
  const hostedMode = isHostedAppMode();

  const handleTheme = (value: AppTheme) => {
    setStoredTheme(value);
    setTheme(value);
  };

  return (
    <div>
      <PageHeader
        icon={Settings}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">{t("settings.appearance")}</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("layout.theme")}</Label>
              <Select value={storedTheme} onValueChange={(value) => handleTheme(value as AppTheme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("layout.system")}</SelectItem>
                  <SelectItem value="light">{t("layout.light")}</SelectItem>
                  <SelectItem value="dark">{t("layout.dark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("layout.language")}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">{t("layout.chinese")}</SelectItem>
                  <SelectItem value="en">{t("layout.english")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {!hostedMode ? (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">{t("settings.localData")}</h3>
            </div>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              {t("settings.localDataDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              <ImportConfigButton />
              <ExportConfigButton />
              <ClearConfigButton />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">{t("settings.hostedData")}</h3>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("settings.hostedDataDesc")}
            </p>
          </section>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">Static Mode</h3>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{t("settings.staticModeDesc1")}</p>
            <p>{t("settings.staticModeDesc2")}</p>
            <p>{t("settings.staticModeDesc3")}</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Globe2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">{t("settings.hostedMode")}</h3>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              {t("settings.hostedConfig", {
                value: String(hostedMode || config?.allowHostedMode || false)
              })}
            </p>
            <p>{hostedMode ? t("settings.hostedEnabledDesc1") : t("settings.hostedDesc1")}</p>
            <p>{hostedMode ? t("settings.hostedEnabledDesc2") : t("settings.hostedDesc2")}</p>
          </div>
          {!hostedMode ? (
            <Button className="mt-4" variant="outline" disabled>
              {t("settings.hostedDisabled")}
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
