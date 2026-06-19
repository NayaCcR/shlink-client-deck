import type { ShlinkShortUrl, ShlinkVisit } from "@/lib/shlink/types";
import { eachDateInRange } from "@/lib/analytics/date-range";
import { formatDate, toIsoDate } from "@/lib/utils";

export type TimeSeriesPoint = {
  date: string;
  label: string;
  visits: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
};

export type TagComparisonPoint = {
  tag: string;
  shortUrls: number;
  visits: number;
};

export function getVisitTotal(shortUrl: ShlinkShortUrl) {
  return shortUrl.visitsSummary?.total ?? 0;
}

export function buildVisitTrend(
  visits: ShlinkVisit[] = [],
  days = 7,
  locale = "zh-CN"
): TimeSeriesPoint[] {
  const buckets = new Map(
    eachDateInRange(days).map((item) => [
      item.key,
      {
        date: item.key,
        label: formatDate(item.date, locale),
        visits: 0
      }
    ])
  );

  for (const visit of visits) {
    if (!visit.date) {
      continue;
    }

    const date = new Date(visit.date);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = toIsoDate(date);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.visits += 1;
    }
  }

  return Array.from(buckets.values());
}

export function buildTopShortUrls(shortUrls: ShlinkShortUrl[] = [], limit = 10) {
  return [...shortUrls]
    .sort((a, b) => getVisitTotal(b) - getVisitTotal(a))
    .slice(0, limit)
    .map((item) => ({
      code: item.shortCode,
      title: item.title || item.shortCode,
      visits: getVisitTotal(item),
      shortUrl: item.shortUrl
    }));
}

export function summarizeTodayYesterday(visits: ShlinkVisit[] = []) {
  const now = new Date();
  const todayKey = toIsoDate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = toIsoDate(yesterday);

  let today = 0;
  let yesterdayCount = 0;

  for (const visit of visits) {
    if (!visit.date) {
      continue;
    }

    const key = toIsoDate(new Date(visit.date));
    if (key === todayKey) {
      today += 1;
    } else if (key === yesterdayKey) {
      yesterdayCount += 1;
    }
  }

  const delta = yesterdayCount === 0 ? (today > 0 ? 100 : 0) : ((today - yesterdayCount) / yesterdayCount) * 100;

  return {
    today,
    yesterday: yesterdayCount,
    delta
  };
}

export function buildDistribution(
  visits: ShlinkVisit[] = [],
  picker: (visit: ShlinkVisit) => string | null | undefined,
  fallback = "Unknown"
): DistributionPoint[] {
  const buckets = new Map<string, number>();

  for (const visit of visits) {
    const value = picker(visit)?.trim() || fallback;
    buckets.set(value, (buckets.get(value) || 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function buildHourlyVisits(visits: ShlinkVisit[] = []) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    visits: 0
  }));

  for (const visit of visits) {
    if (!visit.date) {
      continue;
    }

    const date = new Date(visit.date);
    if (!Number.isNaN(date.getTime())) {
      buckets[date.getHours()].visits += 1;
    }
  }

  return buckets;
}

export function guessBrowser(userAgent?: string | null, fallback = "Unknown") {
  const value = userAgent || "";
  if (/Edg\//.test(value)) return "Edge";
  if (/Chrome\//.test(value) && !/Chromium/.test(value)) return "Chrome";
  if (/Firefox\//.test(value)) return "Firefox";
  if (/Safari\//.test(value) && !/Chrome\//.test(value)) return "Safari";
  if (/MSIE|Trident/.test(value)) return "Internet Explorer";
  return fallback;
}

export function guessOs(userAgent?: string | null, fallback = "Unknown") {
  const value = userAgent || "";
  if (/Windows NT/.test(value)) return "Windows";
  if (/Mac OS X/.test(value)) return "macOS";
  if (/Android/.test(value)) return "Android";
  if (/iPhone|iPad|iPod/.test(value)) return "iOS";
  if (/Linux/.test(value)) return "Linux";
  return fallback;
}

export function getRefererHost(referer?: string | null, directLabel = "Direct visit") {
  if (!referer) {
    return directLabel;
  }

  try {
    return new URL(referer).hostname;
  } catch {
    return referer;
  }
}

export function buildTagComparison(
  shortUrls: ShlinkShortUrl[] = [],
  tagVisitTotals: Record<string, number> = {}
): TagComparisonPoint[] {
  const counts = new Map<string, number>();

  for (const shortUrl of shortUrls) {
    for (const tag of shortUrl.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, shortUrlsCount]) => ({
      tag,
      shortUrls: shortUrlsCount,
      visits: tagVisitTotals[tag] ?? 0
    }))
    .sort((a, b) => b.shortUrls - a.shortUrls || b.visits - a.visits);
}
