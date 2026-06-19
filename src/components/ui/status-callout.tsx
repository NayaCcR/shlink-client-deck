import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatusCalloutProps = {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
  className?: string;
};

const toneClasses = {
  neutral: "border-border bg-secondary/55 text-foreground",
  warning: "border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-100",
  danger: "border-red-300/60 bg-red-50 text-red-950 dark:border-red-800/60 dark:bg-red-950/25 dark:text-red-100",
  success: "border-emerald-300/60 bg-emerald-50 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/25 dark:text-emerald-100"
};

export function StatusCallout({
  icon: Icon,
  title,
  children,
  tone = "neutral",
  className
}: StatusCalloutProps) {
  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone], className)}>
      <div className="flex gap-3">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
        <div>
          <p className="text-sm font-medium">{title}</p>
          {children ? (
            <div className="mt-1 text-sm leading-6 opacity-85">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
