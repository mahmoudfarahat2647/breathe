import type { BreathingSettingsDto } from "./breathing-settings";

export type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

export type SessionHistoryRecordDto = {
  cycleCount: number;
  elapsedSeconds: number;
  durations: BreathingSettingsDto;
  createdAtEpochMs: number;
  calendarDay: CalendarDay;
};

export type SessionHistorySummaryDto = {
  totalSessions: number;
  totalElapsedSeconds: number;
  sessionsThisWeek: number;
  currentStreak: number;
};

export function calendarDayKey(day: CalendarDay): string {
  const month = String(day.month).padStart(2, "0");
  const dayOfMonth = String(day.day).padStart(2, "0");
  return `${day.year}-${month}-${dayOfMonth}`;
}

export function addCalendarDays(day: CalendarDay, delta: number): CalendarDay {
  const utc = Date.UTC(day.year, day.month - 1, day.day);
  const next = new Date(utc + delta * 86_400_000);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function startOfWeek(day: CalendarDay): CalendarDay {
  const utc = Date.UTC(day.year, day.month - 1, day.day);
  const dayOfWeek = new Date(utc).getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addCalendarDays(day, -daysFromMonday);
}

export function endOfWeek(day: CalendarDay): CalendarDay {
  return addCalendarDays(startOfWeek(day), 6);
}

export function isCalendarDayWithinWeek(
  recordDay: CalendarDay,
  today: CalendarDay,
): boolean {
  const startKey = calendarDayKey(startOfWeek(today));
  const endKey = calendarDayKey(endOfWeek(today));
  const recordKey = calendarDayKey(recordDay);
  return recordKey >= startKey && recordKey <= endKey;
}

export function summarizeSessionHistory(
  records: SessionHistoryRecordDto[],
  today: CalendarDay,
): SessionHistorySummaryDto {
  const sessionDays = new Set<string>();
  let totalElapsedSeconds = 0;
  let sessionsThisWeek = 0;

  for (const record of records) {
    totalElapsedSeconds += record.elapsedSeconds;
    sessionDays.add(calendarDayKey(record.calendarDay));
    if (isCalendarDayWithinWeek(record.calendarDay, today)) {
      sessionsThisWeek += 1;
    }
  }

  return {
    totalSessions: records.length,
    totalElapsedSeconds,
    sessionsThisWeek,
    currentStreak: computeCurrentStreak(sessionDays, today),
  };
}

function computeCurrentStreak(
  sessionDays: Set<string>,
  today: CalendarDay,
): number {
  const todayKey = calendarDayKey(today);
  const yesterdayKey = calendarDayKey(addCalendarDays(today, -1));

  let anchor: CalendarDay | null = null;
  if (sessionDays.has(todayKey)) {
    anchor = today;
  } else if (sessionDays.has(yesterdayKey)) {
    anchor = addCalendarDays(today, -1);
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (sessionDays.has(calendarDayKey(cursor))) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}
