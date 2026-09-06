import { describe, expect, it } from "vitest";

import {
  BREATHING_PRESET_CATALOG,
  BreathingPreset,
  type BreathingPresetId,
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
} from "@/domain/breathing-preset";
import { BreathingSettings } from "@/domain/breathing-settings";
import { DomainValidationError } from "@/domain/errors";

describe("BreathingPreset catalog", () => {
  it("lists five named presets with Resonance Coherence as default", () => {
    expect(BREATHING_PRESET_CATALOG).toHaveLength(5);
    expect(DEFAULT_PRESET_ID).toBe("resonance-coherence");
    const resonance = findPresetById("resonance-coherence");
    expect(resonance?.durations).toEqual({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
    expect(resonance?.recommendedCycles).toBe(25);
    expect(resonance?.topOffSeconds).toBeNull();
    expect(resonance?.alternateNostrils).toBe(false);
    expect(resonance?.description).toBe(
      "Equal 5.5-second inhale and exhale — the resonance-frequency rhythm that maximises heart-rate variability.",
    );
  });

  it("includes acute-de-stress, mood-elevation, sleep-shift-478, and executive-focus presets", () => {
    const acute = findPresetById("acute-de-stress");
    expect(acute?.durations).toEqual({
      inhale: 3,
      hold: 0,
      exhale: 6,
      rest: 1,
    });
    expect(acute?.recommendedCycles).toBe(4);
    expect(acute?.topOffSeconds).toBe(1);
    expect(acute?.alternateNostrils).toBe(false);
    expect(acute?.description).toBe(
      "A short second inhale on top of the first, then a long exhale — the physiological sigh, the fastest way to down-regulate acute stress.",
    );

    const mood = findPresetById("mood-elevation");
    expect(mood?.durations).toEqual({
      inhale: 4,
      hold: 2,
      exhale: 6,
      rest: 1,
    });
    expect(mood?.recommendedCycles).toBe(10);
    expect(mood?.topOffSeconds).toBeNull();
    expect(mood?.alternateNostrils).toBe(true);
    expect(mood?.description).toBe(
      "Alternate-nostril breathing (Nadi Shodhana), traditionally used to steady and lift mood.",
    );

    const sleep = findPresetById("sleep-shift-478");
    expect(sleep?.durations).toEqual({
      inhale: 4,
      hold: 7,
      exhale: 8,
      rest: 1,
    });
    expect(sleep?.recommendedCycles).toBe(4);
    expect(sleep?.topOffSeconds).toBeNull();
    expect(sleep?.alternateNostrils).toBe(false);
    expect(sleep?.description).toBe(
      "Inhale 4, hold 7, exhale 8 — a long-hold, long-exhale pattern for winding down before sleep.",
    );

    const focus = findPresetById("executive-focus");
    expect(focus?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 4,
      rest: 4,
    });
    expect(focus?.recommendedCycles).toBe(12);
    expect(focus?.topOffSeconds).toBeNull();
    expect(focus?.alternateNostrils).toBe(false);
    expect(focus?.description).toBe(
      "Equal four-count box breathing — steady and symmetric, for holding focus under load.",
    );
  });

  it("validates every preset through BreathingSettings", () => {
    for (const preset of BREATHING_PRESET_CATALOG) {
      expect(() => BreathingSettings.fromDto(preset.durations)).not.toThrow();
    }
  });

  it("matches preset ids from durations and falls back to custom", () => {
    expect(matchPresetId(BreathingSettings.default().toDto())).toBe(
      "resonance-coherence",
    );
    expect(matchPresetId({ inhale: 5, hold: 3, exhale: 7, rest: 2 })).toBe(
      "custom",
    );
  });

  it("validates topOffSeconds in create()", () => {
    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 1.25,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 0,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 3,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 4,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("validates recommendedCycles in create()", () => {
    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 0,
        topOffSeconds: 1,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      BreathingPreset.create({
        id: "acute-de-stress",
        name: "Test",
        description: "Test description",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 101,
        topOffSeconds: 1,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("requires id, name, and description in create()", () => {
    expect(() =>
      BreathingPreset.create({
        id: "" as unknown as BreathingPresetId,
        name: "Test",
        description: "Test",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: null,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });
});
