import { describe, expect, it } from "vitest";

import { SaveSession } from "@/application";
import {
  BreathingSettings,
  DomainValidationError,
  advanceBreathingState,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import type { BreathingSessionDto, SessionRepository } from "@/application";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

function memorySessions(
  store: Map<string, BreathingSessionDto>,
): SessionRepository {
  return {
    async save(session) {
      store.set(session.id, {
        ...session,
        durations: { ...session.durations },
      });
    },
  };
}

function session(overrides: Partial<BreathingSessionDto> = {}): BreathingSessionDto {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    cycleCount: 2,
    elapsedSeconds: 28,
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    ...overrides,
  };
}

describe("SaveSession", () => {
  it("skips persistence when no full cycle completed", async () => {
    const store = new Map<string, BreathingSessionDto>();
    const useCase = new SaveSession(memorySessions(store));
    const result = await useCase.execute(session({ cycleCount: 0 }));

    expect(result).toEqual({ outcome: "skipped", reason: "zero-cycles" });
    expect(store.size).toBe(0);
  });

  it("skips persistence when a stopped partial first cycle maps to zero completed cycles", async () => {
    const settings = BreathingSettings.default();
    const started = startBreathing(createIdleBreathingState());
    const t0 = 0;
    const firstFrame = advanceBreathingState(started, t0, settings);
    const afterOneSecond = advanceBreathingState(firstFrame, t0 + 1_000, settings);
    const partial = advanceBreathingState(afterOneSecond, t0 + 2_000, settings);

    expect(partial.cycleCount).toBe(0);
    expect(partial.phaseIndex).toBe(0);
    expect(partial.totalElapsedSeconds).toBeCloseTo(2, 8);

    const store = new Map<string, BreathingSessionDto>();
    const useCase = new SaveSession(memorySessions(store));
    const result = await useCase.execute({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: partial.cycleCount,
      elapsedSeconds: partial.totalElapsedSeconds,
      durations: settings.toDto(),
    });

    expect(result).toEqual({ outcome: "skipped", reason: "zero-cycles" });
    expect(store.size).toBe(0);
  });

  it("persists a completed session using the caller-supplied id", async () => {
    const store = new Map<string, BreathingSessionDto>();
    const useCase = new SaveSession(memorySessions(store));
    const dto = session();
    const result = await useCase.execute(dto);

    expect(result).toEqual({ outcome: "saved", session: dto });
    expect(store.get(SESSION_ID)?.id).toBe(SESSION_ID);
    expect(store.get(SESSION_ID)?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
  });

  it("reuses the same session id on retry so the repository can upsert", async () => {
    const savedIds: string[] = [];
    const useCase = new SaveSession({
      async save(row) {
        savedIds.push(row.id);
      },
    });

    await useCase.execute(session());
    await useCase.execute(session({ elapsedSeconds: 30 }));

    expect(savedIds).toEqual([SESSION_ID, SESSION_ID]);
  });

  it("does not persist an invalid snapshot", async () => {
    let saves = 0;
    const useCase = new SaveSession({
      async save() {
        saves += 1;
      },
    });

    await expect(
      useCase.execute(session({ id: "not-a-uuid" })),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(saves).toBe(0);
  });
});
