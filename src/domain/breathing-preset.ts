import { DomainValidationError } from "./errors";
import { BreathingSettings, type BreathingSettingsDto } from "./breathing-settings";
import { assertCycleCount } from "./session-goal";

export type BreathingPresetId =
  | "acute-de-stress"
  | "mood-elevation"
  | "resonance-coherence"
  | "sleep-shift-478"
  | "executive-focus"
  | "custom";

export const DEFAULT_PRESET_ID: BreathingPresetId = "resonance-coherence";

export type BreathingPresetDto = {
  id: BreathingPresetId;
  name: string;
  description: string;
  durations: BreathingSettingsDto;
  recommendedCycles: number;
  topOffSeconds: number | null;
  alternateNostrils: boolean;
};

export class BreathingPreset {
  readonly id: BreathingPresetId;
  readonly name: string;
  readonly description: string;
  readonly durations: BreathingSettingsDto;
  readonly recommendedCycles: number;
  readonly topOffSeconds: number | null;
  readonly alternateNostrils: boolean;

  private constructor(dto: BreathingPresetDto) {
    this.id = dto.id;
    this.name = dto.name;
    this.description = dto.description;
    this.durations = { ...dto.durations };
    this.recommendedCycles = dto.recommendedCycles;
    this.topOffSeconds = dto.topOffSeconds;
    this.alternateNostrils = dto.alternateNostrils;
    Object.freeze(this);
  }

  static create(dto: BreathingPresetDto): BreathingPreset {
    if (!dto.id || !dto.name || !dto.description) {
      throw new DomainValidationError("Preset requires id, name, and description.");
    }
    const durations = BreathingSettings.fromDto(dto.durations);
    if (dto.topOffSeconds !== null) {
      if (
        typeof dto.topOffSeconds !== "number" ||
        !Number.isFinite(dto.topOffSeconds) ||
        dto.topOffSeconds <= 0 ||
        !Number.isInteger(dto.topOffSeconds * 2)
      ) {
        throw new DomainValidationError(
          "topOffSeconds must be a positive multiple of 0.5.",
        );
      }
      if (dto.topOffSeconds >= durations.inhale) {
        throw new DomainValidationError(
          "topOffSeconds must be strictly less than inhale duration.",
        );
      }
    }
    assertCycleCount(dto.recommendedCycles);
    return new BreathingPreset(dto);
  }

  toDto(): BreathingPresetDto {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      durations: { ...this.durations },
      recommendedCycles: this.recommendedCycles,
      topOffSeconds: this.topOffSeconds,
      alternateNostrils: this.alternateNostrils,
    };
  }
}

export const BREATHING_PRESET_CATALOG: readonly BreathingPreset[] = [
  BreathingPreset.create({
    id: "acute-de-stress",
    name: "Acute De-Stress",
    description:
      "A short second inhale on top of the first, then a long exhale — the physiological sigh, the fastest way to down-regulate acute stress.",
    durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
    recommendedCycles: 4,
    topOffSeconds: 1,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "mood-elevation",
    name: "Mood Elevation",
    description:
      "Alternate-nostril breathing (Nadi Shodhana), traditionally used to steady and lift mood.",
    durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
    recommendedCycles: 10,
    topOffSeconds: null,
    alternateNostrils: true,
  }),
  BreathingPreset.create({
    id: "resonance-coherence",
    name: "Resonance Coherence",
    description:
      "Equal 5.5-second inhale and exhale — the resonance-frequency rhythm that maximises heart-rate variability.",
    durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
    recommendedCycles: 25,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "sleep-shift-478",
    name: "Sleep Shift (4-7-8)",
    description:
      "Inhale 4, hold 7, exhale 8 — a long-hold, long-exhale pattern for winding down before sleep.",
    durations: { inhale: 4, hold: 7, exhale: 8, rest: 1 },
    recommendedCycles: 4,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "executive-focus",
    name: "Executive Focus",
    description:
      "Equal four-count box breathing — steady and symmetric, for holding focus under load.",
    durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
    recommendedCycles: 12,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
];

export function findPresetById(id: string): BreathingPreset | null {
  return BREATHING_PRESET_CATALOG.find((preset) => preset.id === id) ?? null;
}

export function matchPresetId(
  durations: BreathingSettingsDto,
): BreathingPresetId {
  for (const preset of BREATHING_PRESET_CATALOG) {
    const d = preset.durations;
    if (
      d.inhale === durations.inhale &&
      d.hold === durations.hold &&
      d.exhale === durations.exhale &&
      d.rest === durations.rest
    ) {
      return preset.id;
    }
  }
  return "custom";
}
