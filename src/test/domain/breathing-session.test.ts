import { describe, expect, it } from "vitest";

import {
  BreathingSession,
  BreathingSettings,
  DomainValidationError,
} from "@/domain";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

describe("BreathingSession", () => {
  it("creates a snapshot from a valid DTO", () => {
    const session = BreathingSession.fromDto({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 3,
      elapsedSeconds: 42.5,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });

    expect(session.toDto()).toEqual({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 3,
      elapsedSeconds: 42.5,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });
  });

  it("keeps duration snapshots independent of later settings changes", () => {
    const dto = {
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 1,
      elapsedSeconds: 14,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    };
    const session = BreathingSession.fromDto(dto);
    dto.durations.inhale = 12;
    dto.cycleCount = 99;

    expect(session.toDto().durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
    expect(session.toDto().cycleCount).toBe(1);
    expect(session.durations).toBeInstanceOf(BreathingSettings);
  });

  it("rejects invalid identifiers, negative stats, and invalid durations", () => {
    const valid = {
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 1,
      elapsedSeconds: 10,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    };

    expect(() => BreathingSession.fromDto({ ...valid, id: "bad" })).toThrow(
      DomainValidationError,
    );
    expect(() => BreathingSession.fromDto({ ...valid, userId: "bad" })).toThrow(
      DomainValidationError,
    );
    expect(() =>
      BreathingSession.fromDto({ ...valid, cycleCount: -1 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSession.fromDto({ ...valid, cycleCount: 1.5 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSession.fromDto({ ...valid, elapsedSeconds: -0.01 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSession.fromDto({
        ...valid,
        durations: { inhale: 1, hold: 4, exhale: 6, rest: 2 },
      }),
    ).toThrow(DomainValidationError);
  });

  it("allows a zero-cycle snapshot so the use case can refuse persistence", () => {
    const session = BreathingSession.fromDto({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 0,
      elapsedSeconds: 2,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });
    expect(session.toDto().cycleCount).toBe(0);
    expect(session.hasCompletedCycle()).toBe(false);
  });
});
