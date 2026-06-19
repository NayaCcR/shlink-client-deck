"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type {
  DistributionPoint,
  TagComparisonPoint,
  TimeSeriesPoint
} from "@/lib/analytics/visits";

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

type ChartFrameProps = {
  title: string;
  description?: string;
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  emptyTitle?: string;
  children: React.ReactNode;
};

function ChartFrame({
  title,
  description,
  loading,
  error,
  empty,
  emptyTitle,
  children
}: ChartFrameProps) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {loading ? (
        <div className="flex h-[280px] flex-col justify-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("charts.loading")}
          </div>
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title={t("charts.loadFailed")}
          description={getShlinkErrorMessage(error, t)}
          className="min-h-[280px]"
        />
      ) : empty ? (
        <EmptyState
          icon={BarChart3}
          title={emptyTitle ?? t("charts.emptyTitle")}
          description={t("charts.emptyDescription")}
          className="min-h-[280px]"
        />
      ) : (
        <div className="h-[280px] w-full">{children}</div>
      )}
    </section>
  );
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))"
};

export function VisitTrendChart({
  title,
  description,
  data,
  loading,
  error
}: {
  title: string;
  description?: string;
  data: TimeSeriesPoint[];
  loading?: boolean;
  error?: unknown;
}) {
  const { t } = useTranslation();
  const empty = data.every((item) => item.visits === 0);

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      empty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              t("charts.visitUnit", { count: value }),
              t("charts.visitCount")
            ]}
            labelFormatter={(label) => t("charts.dateLabel", { label })}
          />
          <Line
            type="monotone"
            dataKey="visits"
            stroke={chartColors[0]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function TotalGrowthAreaChart({
  data,
  loading,
  error
}: {
  data: TimeSeriesPoint[];
  loading?: boolean;
  error?: unknown;
}) {
  const { t } = useTranslation();
  let total = 0;
  const cumulative = data.map((item) => {
    total += item.visits;
    return {
      ...item,
      total
    };
  });

  return (
    <ChartFrame
      title={t("charts.totalGrowthTitle")}
      description={t("charts.totalGrowthDesc")}
      loading={loading}
      error={error}
      empty={cumulative.every((item) => item.total === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulative} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              t("charts.visitUnit", { count: value }),
              t("charts.cumulativeVisits")
            ]}
            labelFormatter={(label) => t("charts.dateLabel", { label })}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={chartColors[2]}
            fill={chartColors[2]}
            fillOpacity={0.18}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function TopShortUrlsChart({
  data,
  loading,
  error
}: {
  data: Array<{ title: string; visits: number }>;
  loading?: boolean;
  error?: unknown;
}) {
  const { t } = useTranslation();

  return (
    <ChartFrame
      title={t("charts.topShortUrlsTitle")}
      description={t("charts.topShortUrlsDesc")}
      loading={loading}
      error={error}
      empty={data.length === 0 || data.every((item) => item.visits === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 18, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="title"
            width={100}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              t("charts.visitUnit", { count: value }),
              t("charts.visitCount")
            ]}
          />
          <Bar dataKey="visits" radius={[0, 6, 6, 0]} fill={chartColors[1]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DistributionPieChart({
  title,
  description,
  data,
  loading,
  error
}: {
  title: string;
  description?: string;
  data: DistributionPoint[];
  loading?: boolean;
  error?: unknown;
}) {
  const { t } = useTranslation();

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              t("charts.visitUnit", { count: value }),
              t("charts.visitCount")
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HourlyVisitsChart({
  data,
  loading,
  error
}: {
  data: Array<{ hour: string; visits: number }>;
  loading?: boolean;
  error?: unknown;
}) {
  const { t } = useTranslation();

  return (
    <ChartFrame
      title={t("charts.hourlyTitle")}
      description={t("charts.hourlyDesc")}
      loading={loading}
      error={error}
      empty={data.every((item) => item.visits === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="hour"
            interval={2}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              t("charts.visitUnit", { count: value }),
              t("charts.visitCount")
            ]}
            labelFormatter={(label) => t("charts.timeLabel", { label })}
          />
          <Bar dataKey="visits" radius={[6, 6, 0, 0]} fill={chartColors[3]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function TagComparisonChart({
  data,
  loading,
  error,
  valueKey,
  title,
  description
}: {
  data: TagComparisonPoint[];
  loading?: boolean;
  error?: unknown;
  valueKey: "shortUrls" | "visits";
  title: string;
  description?: string;
}) {
  const { t } = useTranslation();

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      empty={data.length === 0 || data.every((item) => item[valueKey] === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 12)} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="tag"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [
              String(value),
              valueKey === "visits" ? t("charts.visitCount") : t("charts.shortUrlCount")
            ]}
          />
          <Bar
            dataKey={valueKey}
            radius={[6, 6, 0, 0]}
            fill={valueKey === "visits" ? chartColors[1] : chartColors[0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
