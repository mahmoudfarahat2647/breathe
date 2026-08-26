import { describe, expect, it } from "vitest";

import { ApplyPreset } from "@/application/apply-preset";
import { DomainValidationError } from "@/domain/errors";

describe("ApplyPreset", () => {
  it("returns validated durations for a catalog preset", () => {
    const useCase = new ApplyPreset();
    expect(useCase.execute("box")).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 4,
      rest: 4,
    });
  });

  it("rejects unknown preset ids", () => {
    const useCase = new ApplyPreset();
    expect(() => useCase.execute("unknown")).toThrow(DomainValidationError);
  });
});
