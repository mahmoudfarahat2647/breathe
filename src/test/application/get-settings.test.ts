import { describe, expect, it } from "vitest";

import { GetSettings } from "@/application";
import { DomainValidationError } from "@/domain";
import type { SettingsRepository } from "@/application";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function memorySettings(
  store: Map<string, { inhale: number; hold: number; exhale: number }>,
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

describe("GetSettings", () => {
  it("returns the recommended 4-4-6 pattern when nothing is stored", async () => {
    const useCase = new GetSettings(memorySettings(new Map()));
    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
    });
  });

  it("returns stored durations after domain validation", async () => {
    const store = new Map([
      [USER_ID, { inhale: 5, hold: 2, exhale: 8 }],
    ]);
    const useCase = new GetSettings(memorySettings(store));
    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      inhale: 5,
      hold: 2,
      exhale: 8,
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
