import { DomainValidationError, type CalendarDay } from "@/domain";

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function assertIanaTimeZone(timeZone: string): string {
  if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
    throw new DomainValidationError("A valid IANA time zone is required.");
  }
  const normalized = timeZone.trim();
  if (!isValidIanaTimeZone(normalized)) {
    throw new DomainValidationError("A valid IANA time zone is required.");
  }
  return normalized;
}

export function calendarDayFromIso(iso: string, timeZone: string): CalendarDay {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function todayInTimeZone(timeZone: string): CalendarDay {
  return calendarDayFromIso(new Date().toISOString(), timeZone);
}

export function resolveTimeZoneFromRequest(request: Request): string {
  const url = new URL(request.url);
  const query = url.searchParams.get("timeZone") ?? url.searchParams.get("timezone");
  const header =
    request.headers.get("x-time-zone") ?? request.headers.get("x-timezone");
  const candidate = query ?? header;
  if (candidate === null || candidate.trim().length === 0) {
    return "UTC";
  }
  return assertIanaTimeZone(candidate);
}
