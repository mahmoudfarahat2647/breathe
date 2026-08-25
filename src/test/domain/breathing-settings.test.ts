import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  DomainValidationError,
  PHASE_DURATION_LIMITS,
} from "@/domain";

describe("BreathingSettings", () => {
  it("defaults to the recommended 4-4-6 pattern", () => {
    expect(BreathingSettings.default().toDto()).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
    });
  });

  it("accepts durations at the reference min and max", () => {
    const settings = BreathingSettings.fromDto({
      inhale: PHASE_DURATION_LIMITS.inhale.min,
      hold: PHASE_DURATION_LIMITS.hold.min,
      exhale: PHASE_DURATION_LIMITS.exhale.min,
    });
    expect(settings.toDto()).toEqual({ inhale: 2, hold: 1, exhale: 2 });

    const maxed = BreathingSettings.fromDto({
      inhale: 15,
      hold: 15,
      exhale: 15,
    });
    expect(maxed.toDto()).toEqual({ inhale: 15, hold: 15, exhale: 15 });
  });

  it("rejects durations outside the reference limits", () => {
    expect(() =>
      BreathingSettings.fromDto({ inhale: 1, hold: 4, exhale: 6 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 16, hold: 4, exhale: 6 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: 0, exhale: 6 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 1 }),
    ).toThrow(DomainValidationError);
  });

  it("rejects non-integer and non-finite durations", () => {
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4.5, hold: 4, exhale: 6 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: Number.NaN, hold: 4, exhale: 6 }),
    ).toThrow(DomainValidationError);
  });

  it("maps a plain DTO without retaining the input object", () => {
    const dto = { inhale: 5, hold: 3, exhale: 8 };
    const settings = BreathingSettings.fromDto(dto);
    dto.inhale = 9;
    expect(settings.toDto()).toEqual({ inhale: 5, hold: 3, exhale: 8 });
    expect(settings.toDto()).not.toBe(dto);
  });

  it("clamps stepper adjustments to phase limits", () => {
    const minHold = BreathingSettings.fromDto({
      inhale: 4,
      hold: 1,
      exhale: 6,
    });
    expect(minHold.adjust("hold", -1).toDto().hold).toBe(1);

    const maxInhale = BreathingSettings.fromDto({
      inhale: 15,
      hold: 4,
      exhale: 6,
    });
    expect(maxInhale.adjust("inhale", 1).toDto().inhale).toBe(15);
  });
});
