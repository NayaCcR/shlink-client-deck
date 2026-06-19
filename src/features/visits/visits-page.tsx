"use client";

import { AlertCircle, BarChart3 } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllShortUrls } from "@/features/short-urls/short-url-hooks";
import {
  DistributionPieChart,
  HourlyVisitsChart,
  VisitTrendChart
} from "@/features/visits/chart-components";
import { useShortUrlVisits } from "@/features/visits/visit-hooks";
import { getDateRange } from "@/lib/analytics/date-range";
import {
  buildDistribution,
  buildHourlyVisits,
  buildVisitTrend,
  getRefererHost,
  guessBrowser,
  guessOs
} from "@/lib/analytics/visits";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";

type VisitsPageProps = {
  server: ShlinkServer | null;
};

export function VisitsPage({ server }: VisitsPageProps) {
  const { t, i18n } = useTranslation();
  const [selectedShortUrl, setSelectedShortUrl] = React.useState<string>("");
  const [days, setDays] = React.useState<7 | 30>(30);
  const shortUrlsQuery = useAllShortUrls(server);
  const shortUrls = shortUrlsQuery.data ?? [];
  const activeShortUrl =
    shortUrls.find((item) => item.shortUrl === selectedShortUrl) ?? shortUrls[0] ?? null;
  const dateRange = React.useMemo(() => getDateRange(days), [days]);
  const visitsQuery = useShortUrlVisits(server, activeShortUrl, {
    itemsPerPage: 1000,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  const visits = visitsQuery.data?.visits.data ?? [];

  React.useEffect(() => {
    if (!selectedShortUrl && shortUrls[0]) {
      setSelectedShortUrl(shortUrls[0].shortUrl);
    }
  }, [selectedShortUrl, shortUrls]);

  if (!server) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t("visits.noServerTitle")}
        description={t("visits.noServerDescription")}
      />
    );
  }

  if (shortUrlsQuery.isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("visits.loadShortUrlsFailed")}
        description={getShlinkErrorMessage(shortUrlsQuery.error, t)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title={t("visits.title")}
        description={t("visits.description")}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className={`h-10 rounded-md px-4 text-sm font-medium ${days === 7 ? "bg-primary text-primary-foreground" : "border border-input bg-background"}`}
              onClick={() => setDays(7)}
            >
              {t("visits.last7Days")}
            </button>
            <button
              type="button"
              className={`h-10 rounded-md px-4 text-sm font-medium ${days === 30 ? "bg-primary text-primary-foreground" : "border border-input bg-background"}`}
              onClick={() => setDays(30)}
            >
              {t("visits.last30Days")}
            </button>
          </div>
        }
      />

      <div className="mb-5">
        <Select value={activeShortUrl?.shortUrl || ""} onValueChange={setSelectedShortUrl}>
          <SelectTrigger className="max-w-xl">
            <SelectValue placeholder={t("visits.selectShortUrl")} />
          </SelectTrigger>
          <SelectContent>
            {shortUrls.map((item) => (
              <SelectItem key={item.shortUrl} value={item.shortUrl}>
                {item.title || item.shortCode} · {item.shortUrl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shortUrlsQuery.isLoading ? (
        <EmptyState
          icon={BarChart3}
          title={t("visits.loadingShortUrls")}
          description={t("visits.loadingShortUrlsDesc")}
        />
      ) : shortUrls.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("visits.emptyTitle")}
          description={t("visits.emptyDescription")}
        />
      ) : (
        <div className="grid gap-5">
          <VisitTrendChart
            title={t("visits.trendTitle")}
            description={activeShortUrl?.shortUrl}
            data={buildVisitTrend(visits, days, i18n.language)}
            loading={visitsQuery.isLoading}
            error={visitsQuery.error}
          />
          <div className="grid gap-5 xl:grid-cols-2">
            <DistributionPieChart
              title={t("visits.refererTitle")}
              description={t("visits.refererDesc")}
              data={buildDistribution(
                visits,
                (visit) => getRefererHost(visit.referer, t("common.directVisit")),
                t("common.unknown")
              )}
              loading={visitsQuery.isLoading}
              error={visitsQuery.error}
            />
            <DistributionPieChart
              title={t("visits.browserTitle")}
              data={buildDistribution(
                visits,
                (visit) => guessBrowser(visit.userAgent, t("common.unknown")),
                t("common.unknown")
              )}
              loading={visitsQuery.isLoading}
              error={visitsQuery.error}
            />
            <DistributionPieChart
              title={t("visits.osTitle")}
              data={buildDistribution(
                visits,
                (visit) => guessOs(visit.userAgent, t("common.unknown")),
                t("common.unknown")
              )}
              loading={visitsQuery.isLoading}
              error={visitsQuery.error}
            />
            <DistributionPieChart
              title={t("visits.countryTitle")}
              data={buildDistribution(
                visits,
                (visit) =>
                  visit.visitLocation?.countryName || visit.visitLocation?.countryCode || t("common.unknown"),
                t("common.unknown")
              )}
              loading={visitsQuery.isLoading}
              error={visitsQuery.error}
            />
          </div>
          <HourlyVisitsChart
            data={buildHourlyVisits(visits)}
            loading={visitsQuery.isLoading}
            error={visitsQuery.error}
          />
        </div>
      )}
    </div>
  );
}
