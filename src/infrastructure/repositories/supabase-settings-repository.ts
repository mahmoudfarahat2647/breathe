import type {
  BreathingSettingsDto,
  SettingsRepository,
} from "@/application";

import { PersistenceError } from "../errors";
import { settingsDtoToRow, settingsRowToDto } from "../mappers/settings-row";
import type { BreathingSupabaseClient } from "../supabase/browser-client";

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly client: BreathingSupabaseClient) {}

  async getByUserId(userId: string): Promise<BreathingSettingsDto | null> {
    const { data, error } = await this.client
      .from("breathing_settings")
      .select("user_id, inhale_seconds, hold_seconds, exhale_seconds")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new PersistenceError(error.message);
    }

    return data ? settingsRowToDto(data) : null;
  }

  async save(userId: string, settings: BreathingSettingsDto): Promise<void> {
    const { error } = await this.client
      .from("breathing_settings")
      .upsert(settingsDtoToRow(userId, settings), { onConflict: "user_id" });

    if (error) {
      throw new PersistenceError(error.message);
    }
  }
}
