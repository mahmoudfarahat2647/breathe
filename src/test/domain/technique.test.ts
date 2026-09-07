import { describe, expect, it } from "vitest";

import {
  crossedTopOff,
  inhaleTopOffBoundary,
  nostrilFor,
  techniqueHint,
} from "@/domain/technique";
import type { BreathingPresetDto } from "@/domain/breathing-preset";

const SIGH_PRESET: BreathingPresetDto = {
  id: "acute-de-stress",
  name: "Acute De-Stress",
  description: "Physiological sigh — a double inhale and long exhale.",
  durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
  recommendedCycles: 4,
  topOffSeconds: 1,
  alternateNostrils: false,
};

const NOSTRIL_PRESET: BreathingPresetDto = {
  id: "mood-elevation",
  name: "Mood Elevation",
  description: "Nadi Shodhana — alternate-nostril breathing.",
  durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
  recommendedCycles: 10,
  topOffSeconds: null,
  alternateNostrils: true,
};

const PLAIN_PRESET: BreathingPresetDto = {
  id: "executive-focus",
  name: "Executive Focus",
  description: "Box breathing.",
  durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
  recommendedCycles: 12,
  topOffSeconds: null,
  alternateNostrils: false,
};

describe("inhaleTopOffBoundary", () => {
  it("is inhaleDuration - topOffSeconds when topOffSeconds is set", () => {
    expect(inhaleTopOffBoundary(1, 3)).toBe(2);
  });

  it("is null when topOffSeconds is null", () => {
    expect(inhaleTopOffBoundary(null, 3)).toBeNull();
  });

  it("stays ramp-safe: recomputed against the live inhale duration, not the base", () => {
    // A Ramp that lengthens inhale to 5s still boundary-s at 5 - 1 = 4.
    expect(inhaleTopOffBoundary(1, 5)).toBe(4);
  });
});

describe("crossedTopOff", () => {
  it("is true when elapsed crosses the boundary within one frame", () => {
    expect(crossedTopOff(1.8, 2.1, 2)).toBe(true);
  });

  it("is false when elapsed stays below the boundary", () => {
    expect(crossedTopOff(1.0, 1.5, 2)).toBe(false);
  });

  it("is false once elapsed is already past the boundary (fires once, not every frame)", () => {
    expect(crossedTopOff(2.1, 2.4, 2)).toBe(false);
  });

  it("is false when boundary is null", () => {
    expect(crossedTopOff(1.8, 2.1, null)).toBe(false);
  });

  it("counts landing exactly on the boundary as crossed", () => {
    expect(crossedTopOff(1.8, 2.0, 2)).toBe(true);
  });
});

describe("nostrilFor", () => {
  it("even cycles: inhale is left, exhale is right", () => {
    expect(nostrilFor(0, "inhale")).toBe("left");
    expect(nostrilFor(0, "exhale")).toBe("right");
    expect(nostrilFor(2, "inhale")).toBe("left");
    expect(nostrilFor(2, "exhale")).toBe("right");
  });

  it("odd cycles: inhale is right, exhale is left", () => {
    expect(nostrilFor(1, "inhale")).toBe("right");
    expect(nostrilFor(1, "exhale")).toBe("left");
    expect(nostrilFor(3, "inhale")).toBe("right");
    expect(nostrilFor(3, "exhale")).toBe("left");
  });

  it("hold and rest are never nostril-cued", () => {
    expect(nostrilFor(0, "hold")).toBeNull();
    expect(nostrilFor(0, "rest")).toBeNull();
    expect(nostrilFor(1, "hold")).toBeNull();
    expect(nostrilFor(1, "rest")).toBeNull();
  });
});

describe("techniqueHint", () => {
  it("is null when preset is null", () => {
    expect(techniqueHint(null, "inhale", false, 0)).toBeNull();
  });

  it("is null for a preset with neither topOffSeconds nor alternateNostrils", () => {
    expect(techniqueHint(PLAIN_PRESET, "inhale", false, 0)).toBeNull();
    expect(techniqueHint(PLAIN_PRESET, "inhale", true, 0)).toBeNull();
  });

  it("shows the top-off hint only after the boundary is crossed, and only on inhale", () => {
    expect(techniqueHint(SIGH_PRESET, "inhale", false, 0)).toBeNull();
    expect(techniqueHint(SIGH_PRESET, "inhale", true, 0)).toBe("Top-off breath");
    expect(techniqueHint(SIGH_PRESET, "exhale", true, 0)).toBeNull();
    expect(techniqueHint(SIGH_PRESET, "hold", true, 0)).toBeNull();
  });

  it("shows the nostril hint on inhale and exhale, alternating by cycle", () => {
    expect(techniqueHint(NOSTRIL_PRESET, "inhale", false, 0)).toBe("Left nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "exhale", false, 0)).toBe("Right nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "inhale", false, 1)).toBe("Right nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "exhale", false, 1)).toBe("Left nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "hold", false, 0)).toBeNull();
    expect(techniqueHint(NOSTRIL_PRESET, "rest", false, 0)).toBeNull();
  });
});
