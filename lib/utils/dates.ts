const EASTERN_TIME_ZONE = "America/New_York";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const parseDateOnly = (value: string): DateParts | null => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
};

const getEasternDateParts = (date: Date): DateParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
};

const compareDateParts = (left: DateParts, right: DateParts): number => {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
};

const buildDateFromParts = (parts: DateParts): Date =>
  new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));

export const formatDateOnlyEastern = (
  value: string,
  options: Intl.DateTimeFormatOptions
): string => {
  if (!value) return "";

  const parsed = parseDateOnly(value);
  const date = parsed ? buildDateFromParts(parsed) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    ...options,
  }).format(date);
};

export const isDateOnOrAfterTodayEastern = (value: string): boolean => {
  if (!value) return false;

  const todayParts = getEasternDateParts(new Date());
  const parsed = parseDateOnly(value);

  if (parsed) {
    return compareDateParts(parsed, todayParts) >= 0;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return compareDateParts(getEasternDateParts(date), todayParts) >= 0;
};
