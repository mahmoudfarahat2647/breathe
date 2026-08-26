import { DomainValidationError } from "./errors";
import type { BreathingSettingsDto } from "./breathing-settings";

export type BreathingPresetId =
  | "current-calm"
  | "triangle"
  | "box"
  | "relaxation-478"
  | "coherence"
  | "custom";

export const DEFAULT_PRESET_ID: BreathingPresetId = "current-calm";

export type BreathingPresetDto = {
  id: BreathingPresetId;
  name: string;
  description: string;
  durations: BreathingSettingsDto;
};

export class BreathingPreset {
  readonly id: BreathingPresetId;
  readonly name: string;
  readonly description: string;
  readonly durations: BreathingSettingsDto;

  private constructor(dto: BreathingPresetDto) {
    this.id = dto.id;
    this.name = dto.name;
    this.description = dto.description;
    this.durations = { ...dto.durations };
    Object.freeze(this);
  }

  static create(dto: BreathingPresetDto): BreathingPreset {
    if (!dto.id || !dto.name || !dto.description) {
      throw new DomainValidationError("Preset requires id, name, and description.");
    }
    return new BreathingPreset(dto);
  }

  toDto(): BreathingPresetDto {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      durations: { ...this.durations },
    };
  }
}

export const BREATHING_PRESET_CATALOG: readonly BreathingPreset[] = [
  BreathingPreset.create({
    id: "current-calm",
    name: "Current Calm",
    description:
      "Inhale 4s, hold 4s, exhale 6s, rest 2s — a common calming pattern with a longer exhale.",
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
  }),
  BreathingPreset.create({
    id: "triangle",
    name: "Triangle",
    description: "Inhale 4s, hold 4s, exhale 6s — three equal sides with no rest.",
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 0 },
  }),
  BreathingPreset.create({
    id: "box",
    name: "Box",
    description: "Equal 4s phases — inhale, hold, exhale, and rest.",
    durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
  }),
  BreathingPreset.create({
    id: "relaxation-478",
    name: "4-7-8 Relaxation",
    description:
      "Inhale 4s, hold 7s, exhale 8s — often used for relaxation before sleep.",
    durations: { inhale: 4, hold: 7, exhale: 8, rest: 0 },
  }),
  BreathingPreset.create({
    id: "coherence",
    name: "Coherence",
    description: "Inhale 5s, exhale 5s — heart-coherence rhythm with no hold or rest.",
    durations: { inhale: 5, hold: 0, exhale: 5, rest: 0 },
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
