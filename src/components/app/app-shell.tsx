"use client";

import {
  BarChart3,
  ChevronDown,
  Home,
  Languages,
  Link2,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Server,
  Settings,
  Sun,
  Tags,
  X
} from "lucide-react";
import * as React from "react";
import { useTheme } from "next-themes";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentServer, useServerStore } from "@/features/servers/server-store";
import { useSettingsStore } from "@/features/settings/settings-store";
import { CreateShortUrlDialog } from "@/features/short-urls/create-short-url-dialog";
import { useHostedLogout } from "@/features/auth/hosted-hooks";

export type AppView = "overview" | "short-urls" | "visits" | "tags" | "servers" | "settings";

type AppShellProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  mode?: "static" | "hosted";
  children: React.ReactNode;
};

const navItems: Array<{
  view: AppView;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { view: "overview", labelKey: "nav.overview", icon: Home },
  { view: "short-urls", labelKey: "nav.shortUrls", icon: Link2 },
  { view: "visits", labelKey: "nav.visits", icon: BarChart3 },
  { view: "tags", labelKey: "nav.tags", icon: Tags },
  { view: "servers", labelKey: "nav.servers", icon: Server },
  { view: "settings", labelKey: "nav.settings", icon: Settings }
];

function Sidebar({
  activeView,
  onViewChange,
  onNavigate,
  mode
}: {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onNavigate?: () => void;
  mode: "static" | "hosted";
}) {
  const { t } = useTranslation();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Link2 className="h-5 w-5" />
        </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-normal text-primary">
              {t("appName")}
            </p>
            <p className="text-[11px] uppercase text-muted-foreground">
              {t("layout.sidebarSubtitle")}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-medium uppercase text-muted-foreground">
            {t("layout.workspace")}
          </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.view === activeView;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => {
                onViewChange(item.view);
                onNavigate?.();
              }}
              className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
                <span className="truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}
        </div>
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg border border-border bg-muted/35 p-3">
          <p className="text-xs font-medium">
            {mode === "hosted" ? t("layout.hostedMode") : t("layout.staticMode")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {mode === "hosted" ? t("layout.hostedModeTip") : t("layout.staticModeTip")}
          </p>
        </div>
      </div>
    </aside>
  );
}

function ServerSwitcher() {
  const { t } = useTranslation();
  const servers = useServerStore((state) => state.servers);
  const currentServerId = useServerStore((state) => state.currentServerId);
  const setCurrentServerId = useServerStore((state) => state.setCurrentServerId);
  const currentServer = useCurrentServer();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-0 max-w-[220px] justify-start">
          <Server className="h-4 w-4" />
          <span className="truncate">{currentServer?.name || t("layout.selectServer")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("layout.shlinkServers")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {servers.map((server) => (
          <DropdownMenuItem
            key={server.id}
            onClick={() => setCurrentServerId(server.id)}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">{server.name}</span>
            {server.id === currentServerId ? <Badge>{t("layout.current")}</Badge> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeLanguageControls() {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const setStoredTheme = useSettingsStore((state) => state.setTheme);
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const isDark = resolvedTheme === "dark";
  const localeOptions = React.useMemo(
    () => [
      {
        code: "zh-CN",
        label: t("layout.chinese"),
        shortLabel: t("layout.chineseShort")
      },
      {
        code: "en",
        label: t("layout.english"),
        shortLabel: t("layout.englishShort")
      }
    ],
    [t]
  );
  const currentLocale =
    localeOptions.find((option) => option.code === locale) ?? localeOptions[0];

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("layout.toggleTheme")}
        title={isDark ? t("layout.switchToLight") : t("layout.switchToDark")}
        onClick={toggleTheme}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={t("layout.selectLanguage")}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-muted focus-ring",
            open && "border-primary text-primary"
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentLocale.shortLabel}</span>
          <span className="sm:hidden">{currentLocale.code.split("-")[0].toUpperCase()}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-max min-w-full max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg transition",
            open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          )}
        >
          {localeOptions.map((option) => {
            const active = option.code === locale;
            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLocale(option.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-4 whitespace-nowrap rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <span>{option.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {option.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  activeView,
  onViewChange,
  globalSearch,
  onGlobalSearchChange,
  mode = "static",
  children
}: AppShellProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const currentServer = useCurrentServer();
  const logout = useHostedLogout();

  return (
    <div className="min-h-screen bg-muted/25 text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <Sidebar activeView={activeView} onViewChange={onViewChange} mode={mode} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            type="button"
            aria-label={t("layout.closeNavigation")}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[86vw]">
            <Sidebar
              activeView={activeView}
              onViewChange={onViewChange}
              onNavigate={() => setMobileOpen(false)}
              mode={mode}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-3 top-3"
              aria-label={t("layout.closeNavigation")}
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="flex h-auto min-h-14 flex-col gap-3 px-4 py-3 sm:px-6 lg:h-14 lg:flex-row lg:items-center lg:px-8 lg:py-0">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("layout.openNavigation")}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-sm font-semibold text-primary">{t("appName")}</p>
                <p className="text-xs text-muted-foreground">{t("layout.subtitle")}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalSearch}
                  onChange={(event) => onGlobalSearchChange(event.target.value)}
                  placeholder={t("layout.searchPlaceholder")}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 lg:ml-auto">
                <ServerSwitcher />
                <CreateShortUrlDialog
                  server={currentServer}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4" />
                      {t("actions.createShortUrl")}
                    </Button>
                  }
                />
                <ThemeLanguageControls />
                {mode === "hosted" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("hosted.auth.logout")}
                    title={t("hosted.auth.logout")}
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className="page-shell flex-1">{children}</main>
      </div>
    </div>
  );
}
