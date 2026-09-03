import { describe, expect, it } from "vitest";

import { SaveSettings } from "@/application";
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

describe("SaveSettings", () => {
  it("validates and persists preferences, returning a DTO", async () => {
    const store = new Map<string, BreathingPreferencesDto>();
    const useCase = new SaveSettings(memorySettings(store));
    const saved = await useCase.execute(USER_ID, {
      durations: { inhale: 7, hold: 3, exhale: 9, rest: 2 },
      goal: { kind: "cycles", cycles: 10 },
      ramp: "wind-down",
    });

    expect(saved).toEqual({
      durations: { inhale: 7, hold: 3, exhale: 9, rest: 2 },
      goal: { kind: "cycles", cycles: 10 },
      ramp: "wind-down",
    });
    expect(store.get(USER_ID)).toEqual(saved);
  });

  it("does not persist invalid durations or goals", async () => {
    const store = new Map<string, BreathingPreferencesDto>();
    const useCase = new SaveSettings(memorySettings(store));

    await expect(
      useCase.execute(USER_ID, {
        durations: { inhale: 1, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: null,
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    await expect(
      useCase.execute(USER_ID, {
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: { kind: "minutes", minutes: 0 },
        ramp: null,
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(store.size).toBe(0);
  });
});
