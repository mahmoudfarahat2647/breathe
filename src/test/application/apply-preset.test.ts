import { describe, expect, it } from "vitest";

import { ApplyPreset } from "@/application/apply-preset";
import { DomainValidationError } from "@/domain/errors";

describe("ApplyPreset", () => {
  it("returns the full preset DTO for a catalog preset", () => {
    const useCase = new ApplyPreset();
    expect(useCase.execute("executive-focus")).toEqual({
      id: "executive-focus",
      name: "Executive Focus",
      description:
        "Equal four-count box breathing — steady and symmetric, for holding focus under load.",
      durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
      recommendedCycles: 12,
      topOffSeconds: null,
      alternateNostrils: false,
    });
  });

  it("includes topOffSeconds and alternateNostrils for their respective presets", () => {
    const useCase = new ApplyPreset();
    expect(useCase.execute("acute-de-stress").topOffSeconds).toBe(1);
    expect(useCase.execute("mood-elevation").alternateNostrils).toBe(true);
  });

  it("rejects unknown preset ids", () => {
    const useCase = new ApplyPreset();
    expect(() => useCase.execute("unknown")).toThrow(DomainValidationError);
  });
});
