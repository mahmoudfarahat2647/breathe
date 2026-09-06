import { describe, expect, it } from "vitest";

import { DomainValidationError } from "@/domain";
import { preferencesFromRequestBody } from "@/infrastructure";

describe("preferencesFromRequestBody half-second durations", () => {
  it("passes a half-second duration through unchanged", () => {
    const result = preferencesFromRequestBody({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
    });
    expect(result.durations).toEqual({ inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 });
  });

  it("accepts a quarter-second value at the HTTP boundary (validation is a domain concern)", () => {
    // request-body.ts's asNumber only checks "is a finite number" — half-step
    // rejection happens downstream in BreathingSettings.fromDto, not here.
    const result = preferencesFromRequestBody({
      durations: { inhale: 4.25, hold: 4, exhale: 6, rest: 2 },
    });
    expect(result.durations.inhale).toBe(4.25);
  });
});

describe("BreathingSettings.fromDto rejects the request-body output when not half-step", () => {
  it("throws when the HTTP layer's request-body durations aren't half-step", async () => {
    const { BreathingSettings } = await import("@/domain");
    const preferences = { durations: { inhale: 4.25, hold: 4, exhale: 6, rest: 2 } };
    expect(() => BreathingSettings.fromDto(preferences.durations)).toThrow(
      DomainValidationError,
    );
  });
});
