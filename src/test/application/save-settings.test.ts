import { describe, expect, it } from "vitest";

import { SaveSettings } from "@/application";
import { DomainValidationError } from "@/domain";
import type { SettingsRepository } from "@/application";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function memorySettings(
  store: Map<string, { inhale: number; hold: number; exhale: number; rest: number }>,
): SettingsRepository {
  return {
    async getByUserId(userId) {
      return store.get(userId) ?? null;
    },
    async save(userId, settings) {
      store.set(userId, { ...settings });
    },
  };
}

describe("SaveSettings", () => {
  it("validates and persists durations, returning a DTO", async () => {
    const store = new Map<
      string,
      { inhale: number; hold: number; exhale: number; rest: number }
    >();
    const useCase = new SaveSettings(memorySettings(store));
    const saved = await useCase.execute(USER_ID, {
      inhale: 7,
      hold: 3,
      exhale: 9,
      rest: 2,
    });

    expect(saved).toEqual({ inhale: 7, hold: 3, exhale: 9, rest: 2 });
    expect(store.get(USER_ID)).toEqual(saved);
  });

  it("does not persist invalid durations", async () => {
    const store = new Map<
      string,
      { inhale: number; hold: number; exhale: number; rest: number }
    >();
    const useCase = new SaveSettings(memorySettings(store));

    await expect(
      useCase.execute(USER_ID, { inhale: 1, hold: 4, exhale: 6, rest: 2 }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(store.size).toBe(0);
  });
});
