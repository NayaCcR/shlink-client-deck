"use client";

import { ChevronDown, Languages } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useSettingsStore } from "@/features/settings/settings-store";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
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

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
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
  );
}
