import {
  BreathingSettings,
  findPresetById,
  type BreathingPresetDto,
} from "@/domain";
import { DomainValidationError } from "@/domain/errors";

export class ApplyPreset {
  execute(presetId: string): BreathingPresetDto {
    const preset = findPresetById(presetId);
    if (preset === null) {
      throw new DomainValidationError(`Unknown breathing preset: ${presetId}.`);
    }
    return {
      ...preset.toDto(),
      durations: BreathingSettings.fromDto(preset.durations).toDto(),
    };
  }
}
