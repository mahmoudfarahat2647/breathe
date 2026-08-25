import { BreathingSettings, UserId } from "@/domain";
import type { BreathingSettingsDto } from "@/domain";

import type { SettingsRepository } from "./ports";

export class SaveSettings {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(userId: string, settings: BreathingSettingsDto) {
    const id = UserId.fromDto(userId);
    const validated = BreathingSettings.fromDto(settings).toDto();
    await this.repository.save(id.toDto(), validated);
    return validated;
  }
}
