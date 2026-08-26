import {
  BreathingSettings,
  findPresetById,
  type BreathingSettingsDto,
} from "@/domain";
import { DomainValidationError } from "@/domain/errors";

export class ApplyPreset {
  execute(presetId: string): BreathingSettingsDto {
    const preset = findPresetById(presetId);
    if (preset === null) {
      throw new DomainValidationError(`Unknown breathing preset: ${presetId}.`);
    }
    return BreathingSettings.fromDto(preset.durations).toDto();
  }
}
