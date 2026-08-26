import { BreathingPreferences, UserId } from "@/domain";

import type { SettingsRepository } from "./ports";

export class GetSettings {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(userId: string) {
    const id = UserId.fromDto(userId);
    const stored = await this.repository.getByUserId(id.toDto());
    if (stored === null) {
      return BreathingPreferences.default().toDto();
    }
    return BreathingPreferences.fromDto(stored).toDto();
  }
}
