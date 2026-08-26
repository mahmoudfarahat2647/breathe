import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  calendarDayKey,
  endOfWeek,
  isCalendarDayWithinWeek,
  startOfWeek,
  summarizeSessionHistory,
  type CalendarDay,
  type SessionHistoryRecordDto,
} from "@/domain/session-stats";

const TODAY: CalendarDay = { year: 2026, month: 8, day: 26 }; // Wednesday

function record(
  overrides: Partial<SessionHistoryRecordDto> & Pick<SessionHistoryRecordDto, "calendarDay">,
): SessionHistoryRecordDto {
  return {
    cycleCount: 2,
    elapsedSeconds: 60,
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    createdAtEpochMs: Date.UTC(
      overrides.calendarDay.year,
      overrides.calendarDay.month - 1,
      overrides.calendarDay.day,
    ),
    ...overrides,
  };
}

describe("calendarDayKey", () => {
  it("zero-pads month and day", () => {
    expect(calendarDayKey({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
  });
});

describe("startOfWeek / endOfWeek", () => {
  it("uses Monday through Sunday for the week containing today", () => {
    expect(startOfWeek(TODAY)).toEqual({ year: 2026, month: 8, day: 24 });
    expect(endOfWeek(TODAY)).toEqual({ year: 2026, month: 8, day: 30 });
  });

  it("treats Monday as the first day of the week", () => {
    const monday: CalendarDay = { year: 2026, month: 8, day: 24 };
    expect(startOfWeek(monday)).toEqual(monday);
    expect(endOfWeek(monday)).toEqual({ year: 2026, month: 8, day: 30 });
  });
});

describe("isCalendarDayWithinWeek", () => {
  it("includes Monday and Sunday boundaries", () => {
    expect(
      isCalendarDayWithinWeek({ year: 2026, month: 8, day: 24 }, TODAY),
    ).toBe(true);
    expect(
      isCalendarDayWithinWeek({ year: 2026, month: 8, day: 30 }, TODAY),
    ).toBe(true);
    expect(
      isCalendarDayWithinWeek({ year: 2026, month: 8, day: 23 }, TODAY),
    ).toBe(false);
    expect(
      isCalendarDayWithinWeek({ year: 2026, month: 8, day: 31 }, TODAY),
    ).toBe(false);
  });
});

describe("addCalendarDays", () => {
  it("steps across month boundaries", () => {
    expect(addCalendarDays({ year: 2026, month: 8, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 7,
      day: 31,
    });
  });
});

describe("summarizeSessionHistory", () => {
  it("returns zeros for an empty history", () => {
    expect(summarizeSessionHistory([], TODAY)).toEqual({
      totalSessions: 0,
      totalElapsedSeconds: 0,
      sessionsThisWeek: 0,
      currentStreak: 0,
    });
  });

  it("totals sessions and elapsed seconds", () => {
    const summary = summarizeSessionHistory(
      [
        record({ calendarDay: { year: 2026, month: 8, day: 20 }, elapsedSeconds: 40 }),
        record({ calendarDay: { year: 2026, month: 8, day: 21 }, elapsedSeconds: 55 }),
      ],
      TODAY,
    );
    expect(summary.totalSessions).toBe(2);
    expect(summary.totalElapsedSeconds).toBe(95);
  });

  it("counts every session in the current Monday–Sunday week", () => {
    const summary = summarizeSessionHistory(
      [
        record({ calendarDay: { year: 2026, month: 8, day: 24 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 26 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 23 } }),
      ],
      TODAY,
    );
    expect(summary.sessionsThisWeek).toBe(2);
  });

  it("counts a streak ending today when today has a session", () => {
    const summary = summarizeSessionHistory(
      [
        record({ calendarDay: { year: 2026, month: 8, day: 24 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 25 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 26 } }),
      ],
      TODAY,
    );
    expect(summary.currentStreak).toBe(3);
  });

  it("counts a streak ending yesterday when today has no session", () => {
    const summary = summarizeSessionHistory(
      [
        record({ calendarDay: { year: 2026, month: 8, day: 24 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 25 } }),
      ],
      TODAY,
    );
    expect(summary.currentStreak).toBe(2);
  });

  it("returns zero streak when the latest session is before yesterday", () => {
    const summary = summarizeSessionHistory(
      [record({ calendarDay: { year: 2026, month: 8, day: 20 } })],
      TODAY,
    );
    expect(summary.currentStreak).toBe(0);
  });

  it("deduplicates calendar days for streak but not for weekly session count", () => {
    const summary = summarizeSessionHistory(
      [
        record({ calendarDay: { year: 2026, month: 8, day: 25 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 25 } }),
        record({ calendarDay: { year: 2026, month: 8, day: 26 } }),
      ],
      TODAY,
    );
    expect(summary.currentStreak).toBe(2);
    expect(summary.sessionsThisWeek).toBe(3);
  });
});
