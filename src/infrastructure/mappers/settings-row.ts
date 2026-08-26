import type { BreathingSettingsDto } from "@/domain";

import type { BreathingSettingsRow } from "../supabase/database.types";

export function settingsRowToDto(
  row: Pick<
    BreathingSettingsRow,
    "inhale_seconds" | "hold_seconds" | "exhale_seconds" | "rest_seconds"
  >,
): BreathingSettingsDto {
  return {
    inhale: row.inhale_seconds,
    hold: row.hold_seconds,
    exhale: row.exhale_seconds,
    rest: row.rest_seconds,
  };
}

export function settingsDtoToRow(
  userId: string,
  dto: BreathingSettingsDto,
): Pick<
  BreathingSettingsRow,
  "user_id" | "inhale_seconds" | "hold_seconds" | "exhale_seconds" | "rest_seconds"
> {
  return {
    user_id: userId,
    inhale_seconds: dto.inhale,
    hold_seconds: dto.hold,
    exhale_seconds: dto.exhale,
    rest_seconds: dto.rest,
  };
}
