import { describe, expect, it } from "vitest";

import {
  sessionDtoToRow,
  sessionRowToDto,
  settingsDtoToRow,
  settingsRowToDto,
} from "@/infrastructure";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("settings row mapper", () => {
  it("maps database columns to inner DTOs at the boundary", () => {
    expect(
      settingsRowToDto({
        inhale_seconds: 5,
        hold_seconds: 2,
        exhale_seconds: 8,
        rest_seconds: 3,
      }),
    ).toEqual({ inhale: 5, hold: 2, exhale: 8, rest: 3 });
  });

  it("maps inner DTOs to database columns", () => {
    expect(
      settingsDtoToRow(USER_ID, { inhale: 5, hold: 2, exhale: 8, rest: 3 }),
    ).toEqual({
      user_id: USER_ID,
      inhale_seconds: 5,
      hold_seconds: 2,
      exhale_seconds: 8,
      rest_seconds: 3,
    });
  });
});

describe("session row mapper", () => {
  it("coerces numeric elapsed seconds from the database", () => {
    expect(
      sessionRowToDto({
        id: SESSION_ID,
        user_id: USER_ID,
        cycle_count: 2,
        elapsed_seconds: "28.5",
        inhale_seconds: 4,
        hold_seconds: 4,
        exhale_seconds: 6,
        rest_seconds: 2,
      }),
    ).toEqual({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 2,
      elapsedSeconds: 28.5,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });
  });

  it("maps a session DTO to an insert row", () => {
    expect(
      sessionDtoToRow({
        id: SESSION_ID,
        userId: USER_ID,
        cycleCount: 2,
        elapsedSeconds: 28,
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      }),
    ).toEqual({
      id: SESSION_ID,
      user_id: USER_ID,
      cycle_count: 2,
      elapsed_seconds: 28,
      inhale_seconds: 4,
      hold_seconds: 4,
      exhale_seconds: 6,
      rest_seconds: 2,
    });
  });
});
