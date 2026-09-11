import { describe, expect, it } from "vitest";
import { MAX_SESSIONS_PER_USER, SaveSession } from "@/application";
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
  countOverride?: number,
): SessionRepository {
  return {
    async countByUserId(userId: string) {
      if (countOverride !== undefined) {
        return countOverride;
      }
      let count = 0;
      for (const s of store.values()) {
        if (s.userId === userId) {
          count += 1;
        }
      }
      return count;
    },
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
      async countByUserId() {
        return 0;
      },
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
      async countByUserId() {
        return 0;
      },
      async save() {
        saves += 1;
      },
    });

    await expect(
      useCase.execute(session({ id: "not-a-uuid" })),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(saves).toBe(0);
  });

  it("persists a completed session when user is under the cap", async () => {
    const store = new Map<string, BreathingSessionDto>();
    let queriedUserId: string | null = null;
    const repository: SessionRepository = {
      async countByUserId(userId) {
        queriedUserId = userId;
        return MAX_SESSIONS_PER_USER - 1;
      },
      async save(s) {
        store.set(s.id, s);
      },
    };
    const useCase = new SaveSession(repository);
    const dto = session();
    const result = await useCase.execute(dto);

    expect(result).toEqual({ outcome: "saved", session: dto });
    expect(queriedUserId).toBe(USER_ID);
    expect(store.size).toBe(1);
  });

  it("rejects persistence with quota-exceeded and never calls save when user is at cap", async () => {
    let saveCalled = false;
    const repository: SessionRepository = {
      async countByUserId() {
        return MAX_SESSIONS_PER_USER;
      },
      async save() {
        saveCalled = true;
      },
    };
    const useCase = new SaveSession(repository);
    const result = await useCase.execute(session());

    expect(result).toEqual({ outcome: "rejected", reason: "quota-exceeded" });
    expect(saveCalled).toBe(false);
  });

  it("short-circuits to skipped on zero cycles without consulting the count", async () => {
    let countConsulted = false;
    let saveCalled = false;
    const repository: SessionRepository = {
      async countByUserId() {
        countConsulted = true;
        return 0;
      },
      async save() {
        saveCalled = true;
      },
    };
    const useCase = new SaveSession(repository);
    const result = await useCase.execute(session({ cycleCount: 0 }));

    expect(result).toEqual({ outcome: "skipped", reason: "zero-cycles" });
    expect(countConsulted).toBe(false);
    expect(saveCalled).toBe(false);
  });
});
