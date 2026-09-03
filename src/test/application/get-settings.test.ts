import { describe, expect, it } from "vitest";

import { GetSettings } from "@/application";
import { DomainValidationError } from "@/domain";
import type { BreathingPreferencesDto, SettingsRepository } from "@/application";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function memorySettings(
  store: Map<string, BreathingPreferencesDto>,
): SettingsRepository {
  return {
    async getByUserId(userId) {
      return store.get(userId) ?? null;
    },
    async save(userId, preferences) {
      store.set(userId, structuredClone(preferences));
    },
  };
}

describe("GetSettings", () => {
  it("returns the recommended 4-4-6-2 pattern when nothing is stored", async () => {
    const useCase = new GetSettings(memorySettings(new Map()));
    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: null,
    });
  });

  it("returns stored durations and goal after domain validation", async () => {
    const store = new Map<string, BreathingPreferencesDto>([
      [
        USER_ID,
        {
          durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
          goal: { kind: "minutes", minutes: 10 },
          ramp: "wind-down",
        },
      ],
    ]);
    const useCase = new GetSettings(memorySettings(store));
    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
      goal: { kind: "minutes", minutes: 10 },
      ramp: "wind-down",
    });
  });

  it("rejects an invalid user id before touching the repository", async () => {
    let reads = 0;
    const useCase = new GetSettings({
      async getByUserId() {
        reads += 1;
        return null;
      },
      async save() {},
    });
    await expect(useCase.execute("nope")).rejects.toBeInstanceOf(
      DomainValidationError,
    );
    expect(reads).toBe(0);
  });
});
