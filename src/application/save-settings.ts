import { BreathingPreferences, UserId } from "@/domain";
import type { BreathingPreferencesDto } from "@/domain";

import type { SettingsRepository } from "./ports";

export class SaveSettings {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(userId: string, preferences: BreathingPreferencesDto) {
    const id = UserId.fromDto(userId);
    const validated = BreathingPreferences.fromDto(preferences).toDto();
    await this.repository.save(id.toDto(), validated);
    return validated;
  }
}
