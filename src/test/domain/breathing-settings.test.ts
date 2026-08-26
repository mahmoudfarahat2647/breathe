import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  DomainValidationError,
  PHASE_DURATION_LIMITS,
} from "@/domain";

describe("BreathingSettings", () => {
  it("defaults to the recommended 4-4-6-2 pattern", () => {
    expect(BreathingSettings.default().toDto()).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
  });

  it("accepts durations at the reference min and max", () => {
    const settings = BreathingSettings.fromDto({
      inhale: PHASE_DURATION_LIMITS.inhale.min,
      hold: PHASE_DURATION_LIMITS.hold.min,
      exhale: PHASE_DURATION_LIMITS.exhale.min,
      rest: PHASE_DURATION_LIMITS.rest.min,
    });
    expect(settings.toDto()).toEqual({ inhale: 2, hold: 0, exhale: 2, rest: 0 });

    const maxed = BreathingSettings.fromDto({
      inhale: 15,
      hold: 15,
      exhale: 15,
      rest: 15,
    });
    expect(maxed.toDto()).toEqual({ inhale: 15, hold: 15, exhale: 15, rest: 15 });
  });

  it("accepts zero hold and rest for presets but steppers clamp at 1", () => {
    const zeroHoldRest = BreathingSettings.fromDto({
      inhale: 4,
      hold: 0,
      exhale: 6,
      rest: 0,
    });
    expect(zeroHoldRest.toDto()).toEqual({ inhale: 4, hold: 0, exhale: 6, rest: 0 });

    // Decrementing a 0-second hold or rest stays at 0 (does not jump to 1)
    expect(zeroHoldRest.adjust("hold", -1).toDto().hold).toBe(0);
    expect(zeroHoldRest.adjust("rest", -1).toDto().rest).toBe(0);
    // Incrementing from 0 goes to 1
    expect(zeroHoldRest.adjust("hold", 1).toDto().hold).toBe(1);
    expect(zeroHoldRest.adjust("rest", 1).toDto().rest).toBe(1);

    const minHold = BreathingSettings.fromDto({
      inhale: 4,
      hold: 1,
      exhale: 6,
      rest: 1,
    });
    expect(minHold.adjust("hold", -1).toDto().hold).toBe(1);
    expect(minHold.adjust("rest", -1).toDto().rest).toBe(1);
  });

  it("rejects durations outside the reference limits", () => {
    expect(() =>
      BreathingSettings.fromDto({ inhale: 1, hold: 4, exhale: 6, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 16, hold: 4, exhale: 6, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: -1, exhale: 6, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 1, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: -1 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 16 }),
    ).toThrow(DomainValidationError);
  });

  it("rejects non-integer and non-finite durations", () => {
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4.5, hold: 4, exhale: 6, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({
        inhale: Number.NaN,
        hold: 4,
        exhale: 6,
        rest: 2,
      }),
    ).toThrow(DomainValidationError);
  });

  it("maps a plain DTO without retaining the input object", () => {
    const dto = { inhale: 5, hold: 3, exhale: 8, rest: 2 };
    const settings = BreathingSettings.fromDto(dto);
    dto.inhale = 9;
    expect(settings.toDto()).toEqual({ inhale: 5, hold: 3, exhale: 8, rest: 2 });
    expect(settings.toDto()).not.toBe(dto);
  });

  it("clamps stepper adjustments to phase limits including rest", () => {
    const minHold = BreathingSettings.fromDto({
      inhale: 4,
      hold: 1,
      exhale: 6,
      rest: 1,
    });
    expect(minHold.adjust("hold", -1).toDto().hold).toBe(1);
    expect(minHold.adjust("rest", -1).toDto().rest).toBe(1);

    const maxInhale = BreathingSettings.fromDto({
      inhale: 15,
      hold: 4,
      exhale: 6,
      rest: 15,
    });
    expect(maxInhale.adjust("inhale", 1).toDto().inhale).toBe(15);
    expect(maxInhale.adjust("rest", 1).toDto().rest).toBe(15);
  });
});
