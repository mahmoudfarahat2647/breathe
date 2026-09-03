import { describe, expect, it } from "vitest";

import {
  BreathingPreferences,
  BreathingSettings,
  DomainValidationError,
} from "@/domain";

describe("BreathingPreferences", () => {
  it("defaults ramp to null", () => {
    const preferences = BreathingPreferences.default();
    expect(preferences.toDto().ramp).toBeNull();
    expect(preferences.ramp).toBeNull();
  });

  it("round-trips ramp through fromDto and toDto", () => {
    const preferencesWithNull = BreathingPreferences.fromDto({
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: null,
    });
    expect(preferencesWithNull.ramp).toBeNull();
    expect(preferencesWithNull.toDto().ramp).toBeNull();

    const preferencesWithRamp = BreathingPreferences.fromDto({
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: "wind-down",
    });
    expect(preferencesWithRamp.ramp).toBe("wind-down");
    expect(preferencesWithRamp.toDto().ramp).toBe("wind-down");

    const preferencesWithSlowDown = BreathingPreferences.fromDto({
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: "slow-down",
    });
    expect(preferencesWithSlowDown.ramp).toBe("slow-down");
    expect(preferencesWithSlowDown.toDto().ramp).toBe("slow-down");
  });

  it("updates ramp with withRamp", () => {
    const initial = BreathingPreferences.default();
    expect(initial.ramp).toBeNull();

    const updated = initial.withRamp("wind-down");
    expect(updated.ramp).toBe("wind-down");
    expect(updated.settings).toEqual(initial.settings);
    expect(updated.goal).toBeNull();

    const reset = updated.withRamp(null);
    expect(reset.ramp).toBeNull();
  });

  it("preserves ramp when updating withSettings and withGoal", () => {
    const initial = BreathingPreferences.default().withRamp("wind-down");

    const customSettings = BreathingSettings.fromDto({
      inhale: 5,
      hold: 5,
      exhale: 5,
      rest: 5,
    });
    const withNewSettings = initial.withSettings(customSettings);
    expect(withNewSettings.ramp).toBe("wind-down");
    expect(withNewSettings.settings).toEqual(customSettings);

    const withNewGoal = withNewSettings.withGoal({
      kind: "minutes",
      minutes: 10,
    });
    expect(withNewGoal.ramp).toBe("wind-down");
    expect(withNewGoal.goal).toEqual({ kind: "minutes", minutes: 10 });
  });

  it("throws DomainValidationError when fromDto receives an unknown ramp string", () => {
    expect(() =>
      BreathingPreferences.fromDto({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: "taper" as unknown as null,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      BreathingPreferences.fromDto({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: "invalid" as unknown as null,
      }),
    ).toThrow(DomainValidationError);
  });
});
