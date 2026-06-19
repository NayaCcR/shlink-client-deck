import { toIsoDate } from "@/lib/utils";

export function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
}

export function eachDateInRange(days: number) {
  const { start } = getDateRange(days);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toIsoDate(date)
    };
  });
}
