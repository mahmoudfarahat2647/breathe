import { describe, expect, it } from "vitest";

import {
  BREATHING_PRESET_CATALOG,
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
} from "@/domain/breathing-preset";
import { BreathingSettings } from "@/domain/breathing-settings";

describe("BreathingPreset catalog", () => {
  it("lists five named presets with Current Calm as default", () => {
    expect(BREATHING_PRESET_CATALOG).toHaveLength(5);
    expect(DEFAULT_PRESET_ID).toBe("current-calm");
    expect(findPresetById("current-calm")?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
  });

  it("includes triangle, box, 4-7-8, and coherence patterns", () => {
    expect(findPresetById("triangle")?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    expect(findPresetById("box")?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 4,
      rest: 4,
    });
    expect(findPresetById("relaxation-478")?.durations).toEqual({
      inhale: 4,
      hold: 7,
      exhale: 8,
      rest: 0,
    });
    expect(findPresetById("coherence")?.durations).toEqual({
      inhale: 5,
      hold: 0,
      exhale: 5,
      rest: 0,
    });
  });

  it("validates every preset through BreathingSettings", () => {
    for (const preset of BREATHING_PRESET_CATALOG) {
      expect(() => BreathingSettings.fromDto(preset.durations)).not.toThrow();
    }
  });

  it("matches preset ids from durations and falls back to custom", () => {
    expect(matchPresetId(BreathingSettings.default().toDto())).toBe("current-calm");
    expect(matchPresetId({ inhale: 5, hold: 3, exhale: 7, rest: 2 })).toBe("custom");
  });
});
