import { describe, expect, it } from "vitest";

import { DomainValidationError } from "@/domain";
import { PersistenceError } from "@/infrastructure";
import {
  calendarDayFromIso,
  isValidIanaTimeZone,
  resolveTimeZoneFromRequest,
  todayInTimeZone,
} from "@/infrastructure/time/timezone";
import { sessionRowToHistoryRecord } from "@/infrastructure/mappers/session-row";
import { SupabaseSessionHistoryRepository } from "@/infrastructure/repositories/supabase-session-history-repository";
import type { BreathingSupabaseClient } from "@/infrastructure";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("timezone helpers", () => {
  it("validates IANA time zones", () => {
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
  });

  it("maps created_at to a calendar day in the requested zone", () => {
    expect(
      calendarDayFromIso("2026-08-26T02:30:00.000Z", "America/New_York"),
    ).toEqual({ year: 2026, month: 8, day: 25 });
  });

  it("defaults to UTC when missing and rejects invalid request time zones", () => {
    expect(
      resolveTimeZoneFromRequest(new Request("http://localhost/api/sessions/history")),
    ).toBe("UTC");
    expect(
      resolveTimeZoneFromRequest(
        new Request("http://localhost/api/sessions/history?timeZone="),
      ),
    ).toBe("UTC");
    expect(() =>
      resolveTimeZoneFromRequest(
        new Request("http://localhost/api/sessions/history?timeZone=Bad/Zone"),
      ),
    ).toThrow(DomainValidationError);
  });

  it("accepts a time zone from query or header", () => {
    expect(
      resolveTimeZoneFromRequest(
        new Request("http://localhost/api/sessions/history?timeZone=UTC"),
      ),
    ).toBe("UTC");
    expect(
      resolveTimeZoneFromRequest(
        new Request("http://localhost/api/sessions/history", {
          headers: { "X-Time-Zone": "Europe/London" },
        }),
      ),
    ).toBe("Europe/London");
  });

  it("derives today from the active time zone", () => {
    const today = todayInTimeZone("UTC");
    expect(today.year).toBeGreaterThan(2020);
    expect(today.month).toBeGreaterThanOrEqual(1);
    expect(today.day).toBeGreaterThanOrEqual(1);
  });
});

describe("sessionRowToHistoryRecord", () => {
  it("maps database columns and calendarDay at the boundary", () => {
    expect(
      sessionRowToHistoryRecord(
        {
          cycle_count: 2,
          elapsed_seconds: "45",
          inhale_seconds: 4,
          hold_seconds: 4,
          exhale_seconds: 6,
          rest_seconds: 2,
          created_at: "2026-08-26T12:00:00.000Z",
        },
        "UTC",
      ),
    ).toEqual({
      cycleCount: 2,
      elapsedSeconds: 45,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      createdAtEpochMs: Date.parse("2026-08-26T12:00:00.000Z"),
      calendarDay: { year: 2026, month: 8, day: 26 },
    });
  });
});

describe("SupabaseSessionHistoryRepository", () => {
  it("paginates all rows ordered by created_at desc", async () => {
    const ranges: Array<[number, number]> = [];
    let call = 0;
    const repository = new SupabaseSessionHistoryRepository(
      {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        range(from: number, to: number) {
                          ranges.push([from, to]);
                          call += 1;
                          if (call === 1) {
                            return Promise.resolve({
                              data: Array.from({ length: 100 }, (_, index) => ({
                                cycle_count: 1,
                                elapsed_seconds: 10,
                                inhale_seconds: 4,
                                hold_seconds: 4,
                                exhale_seconds: 6,
                                rest_seconds: 2,
                                created_at: `2026-08-${String(26 - (index % 20)).padStart(2, "0")}T12:00:00.000Z`,
                              })),
                              error: null,
                            });
                          }
                          return Promise.resolve({
                            data: [
                              {
                                cycle_count: 3,
                                elapsed_seconds: 30,
                                inhale_seconds: 4,
                                hold_seconds: 4,
                                exhale_seconds: 6,
                                rest_seconds: 2,
                                created_at: "2026-08-01T12:00:00.000Z",
                              },
                            ],
                            error: null,
                          });
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
      "UTC",
    );

    const records = await repository.listByUserId(USER_ID);
    expect(records).toHaveLength(101);
    expect(ranges).toEqual([
      [0, 99],
      [100, 199],
    ]);
  });

  it("surfaces database errors", async () => {
    const repository = new SupabaseSessionHistoryRepository(
      {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        async range() {
                          return { data: null, error: { message: "read failed" } };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
      "UTC",
    );

    await expect(repository.listByUserId(USER_ID)).rejects.toBeInstanceOf(
      PersistenceError,
    );
  });
});
