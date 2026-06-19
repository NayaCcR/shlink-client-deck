import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning";
};

const toneClasses = {
  default: "bg-secondary text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300"
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default"
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon ? (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-4 text-2xl font-semibold">{value}</div>
      {description ? <p className="mt-2 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
