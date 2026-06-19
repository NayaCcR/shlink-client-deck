"use client";

import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Link2,
  MousePointerClick,
  Server,
  TrendingUp
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerHealth } from "@/features/servers/server-hooks";
import { useAllShortUrls } from "@/features/short-urls/short-url-hooks";
import { useGlobalVisits } from "@/features/visits/visit-hooks";
import {
  TopShortUrlsChart,
  TotalGrowthAreaChart,
  VisitTrendChart
} from "@/features/visits/chart-components";
import { getDateRange } from "@/lib/analytics/date-range";
import {
  buildTopShortUrls,
  buildVisitTrend,
  getVisitTotal,
  summarizeTodayYesterday
} from "@/lib/analytics/visits";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";
import { formatDateTime, formatNumber } from "@/lib/utils";

type OverviewPageProps = {
  server: ShlinkServer | null;
  onNavigateShortUrls: () => void;
};

export function OverviewPage({ server, onNavigateShortUrls }: OverviewPageProps) {
  const { t, i18n } = useTranslation();
  const [days, setDays] = React.useState<7 | 30>(7);
  const dateRange = React.useMemo(() => getDateRange(days), [days]);
  const healthQuery = useServerHealth(server);
  const shortUrlsQuery = useAllShortUrls(server);
  const visitsQuery = useGlobalVisits(server, {
    itemsPerPage: 1000,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  const shortUrls = shortUrlsQuery.data ?? [];
  const visits = visitsQuery.data?.visits.data ?? [];
  const globalVisitsUnavailableReason =
    visitsQuery.data?.unavailableReason ||
    (visitsQuery.data?.unavailableReasonKey
      ? t(visitsQuery.data.unavailableReasonKey)
      : undefined);
  const globalVisitsError = globalVisitsUnavailableReason
    ? new Error(globalVisitsUnavailableReason)
    : visitsQuery.error;
  const trend = React.useMemo(
    () => buildVisitTrend(visits, days, i18n.language),
    [visits, days, i18n.language]
  );
  const todayYesterday = React.useMemo(() => summarizeTodayYesterday(visits), [visits]);
  const totalVisits = shortUrls.reduce((sum, item) => sum + getVisitTotal(item), 0);
  const topShortUrls = React.useMemo(() => buildTopShortUrls(shortUrls), [shortUrls]);
  const recentShortUrls = React.useMemo(
    () =>
      [...shortUrls]
        .sort((a, b) => {
          const left = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
          const right = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
          return right - left;
        })
        .slice(0, 6),
    [shortUrls]
  );

  if (!server) {
    return (
      <EmptyState
        icon={Server}
        title={t("overview.noServerTitle")}
        description={t("overview.noServerDescription")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title={t("overview.title")}
        description={t("overview.description", {
          name: server.name,
          baseUrl: server.baseUrl
        })}
        actions={
          <div className="flex gap-2">
            <Button
              variant={days === 7 ? "default" : "outline"}
              onClick={() => setDays(7)}
            >
              {t("overview.last7Days")}
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              onClick={() => setDays(30)}
            >
              {t("overview.last30Days")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("overview.serverStatus")}
          value={healthQuery.isLoading ? t("overview.checking") : healthQuery.data?.status || t("overview.unknown")}
          description={healthQuery.data?.version ? `Shlink ${healthQuery.data.version}` : server.baseUrl}
          icon={Activity}
          tone={healthQuery.data?.status === "pass" ? "success" : "default"}
        />
        <MetricCard
          title={t("overview.shortUrlsTotal")}
          value={shortUrlsQuery.isLoading ? "…" : formatNumber(shortUrls.length, i18n.language)}
          description={t("overview.shortUrlsTotalDesc")}
          icon={Link2}
        />
        <MetricCard
          title={t("overview.totalVisits")}
          value={shortUrlsQuery.isLoading ? "…" : formatNumber(totalVisits, i18n.language)}
          description={t("overview.totalVisitsDesc")}
          icon={MousePointerClick}
        />
        <MetricCard
          title={t("overview.todayVisits")}
          value={
            visitsQuery.isLoading
              ? "…"
              : visitsQuery.data?.unavailableReason
                ? t("overview.unavailable")
                : formatNumber(todayYesterday.today, i18n.language)
          }
          description={
            visitsQuery.data?.unavailableReason
              ? t("overview.globalVisitsUnavailable")
              : t("overview.yesterdayCompare", {
                  count: formatNumber(todayYesterday.yesterday, i18n.language),
                  delta: `${todayYesterday.delta >= 0 ? "+" : ""}${todayYesterday.delta.toFixed(0)}`
                })
          }
          icon={TrendingUp}
          tone={todayYesterday.delta >= 0 ? "success" : "warning"}
        />
      </div>

      {healthQuery.isError ? (
        <div className="mt-4 rounded-lg border border-red-300/60 bg-red-50 p-4 text-sm text-red-950 dark:border-red-800/60 dark:bg-red-950/25 dark:text-red-100">
          {getShlinkErrorMessage(healthQuery.error, t)}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <VisitTrendChart
          title={t("overview.visitTrendTitle", { days })}
          description={t("overview.visitTrendDesc")}
          data={trend}
          loading={visitsQuery.isLoading}
          error={globalVisitsError}
        />
        <TotalGrowthAreaChart
          data={trend}
          loading={visitsQuery.isLoading}
          error={globalVisitsError}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TopShortUrlsChart
          data={topShortUrls}
          loading={shortUrlsQuery.isLoading}
          error={shortUrlsQuery.error}
        />
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{t("overview.recentShortUrls")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("overview.recentShortUrlsDesc")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onNavigateShortUrls}>
              {t("overview.viewAll")}
            </Button>
          </div>
          {shortUrlsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : shortUrlsQuery.isError ? (
            <EmptyState
              icon={AlertCircle}
              title={t("overview.loadRecentFailed")}
              description={getShlinkErrorMessage(shortUrlsQuery.error, t)}
              className="min-h-[280px]"
            />
          ) : recentShortUrls.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title={t("overview.noRecentTitle")}
              description={t("overview.noRecentDesc")}
              className="min-h-[280px]"
            />
          ) : (
            <div className="space-y-3">
              {recentShortUrls.map((item) => (
                <a
                  key={`${item.domain || "default"}-${item.shortCode}`}
                  href={item.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-border p-3 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title || item.shortCode}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.shortUrl}</p>
                    </div>
                    <Badge variant="outline">
                      {formatNumber(item.visitsSummary?.total, i18n.language)} {t("overview.visitsUnit")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(item.dateCreated, i18n.language, t("common.unknown"))}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
