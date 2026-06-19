import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function maskSecret(value?: string, fallback = "Not set") {
  if (!value) {
    return fallback;
  }

  if (value.length <= 8) {
    return "••••••••";
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function formatNumber(value?: number | null, locale = "zh-CN") {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

export function formatDateTime(
  value?: string | Date | null,
  locale = "zh-CN",
  fallback = "Unknown"
) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatDate(value: Date, locale = "zh-CN") {
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
