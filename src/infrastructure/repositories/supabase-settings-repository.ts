import type {
  BreathingPreferencesDto,
  SettingsRepository,
} from "@/application";

import { PersistenceError } from "../errors";
import { settingsDtoToRow, settingsRowToDto } from "../mappers/settings-row";
import type { BreathingSupabaseClient } from "../supabase/server-client";

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly client: BreathingSupabaseClient) {}

  async getByUserId(userId: string): Promise<BreathingPreferencesDto | null> {
    const { data, error } = await this.client
      .from("breathing_settings")
      .select(
        "user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds, goal_type, goal_value",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new PersistenceError(error.message);
    }

    return data ? settingsRowToDto(data) : null;
  }

  async save(userId: string, preferences: BreathingPreferencesDto): Promise<void> {
    const { error } = await this.client
      .from("breathing_settings")
      .upsert(settingsDtoToRow(userId, preferences), { onConflict: "user_id" });

    if (error) {
      throw new PersistenceError(error.message);
    }
  }
}
