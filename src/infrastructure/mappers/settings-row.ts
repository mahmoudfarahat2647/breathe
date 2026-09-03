import { rampFromDto, type BreathingPreferencesDto } from "@/domain";

import type { BreathingSettingsRow } from "../supabase/database.types";

export function settingsRowToDto(
  row: Pick<
    BreathingSettingsRow,
    | "inhale_seconds"
    | "hold_seconds"
    | "exhale_seconds"
    | "rest_seconds"
    | "goal_type"
    | "goal_value"
    | "ramp"
  >,
): BreathingPreferencesDto {
  return {
    durations: {
      inhale: row.inhale_seconds,
      hold: row.hold_seconds,
      exhale: row.exhale_seconds,
      rest: row.rest_seconds,
    },
    goal: goalFromRow(row.goal_type, row.goal_value),
    ramp: rampFromDto(row.ramp),
  };
}

export function settingsDtoToRow(
  userId: string,
  dto: BreathingPreferencesDto,
): Pick<
  BreathingSettingsRow,
  | "user_id"
  | "inhale_seconds"
  | "hold_seconds"
  | "exhale_seconds"
  | "rest_seconds"
  | "goal_type"
  | "goal_value"
  | "ramp"
> {
  const goal = goalToRow(dto.goal);
  return {
    user_id: userId,
    inhale_seconds: dto.durations.inhale,
    hold_seconds: dto.durations.hold,
    exhale_seconds: dto.durations.exhale,
    rest_seconds: dto.durations.rest,
    goal_type: goal.goal_type,
    goal_value: goal.goal_value,
    ramp: dto.ramp,
  };
}

function goalFromRow(
  goalType: BreathingSettingsRow["goal_type"],
  goalValue: BreathingSettingsRow["goal_value"],
): BreathingPreferencesDto["goal"] {
  if (goalType === null || goalValue === null) {
    return null;
  }
  if (goalType === "minutes") {
    return { kind: "minutes", minutes: goalValue };
  }
  return { kind: "cycles", cycles: goalValue };
}

function goalToRow(goal: BreathingPreferencesDto["goal"]): {
  goal_type: BreathingSettingsRow["goal_type"];
  goal_value: BreathingSettingsRow["goal_value"];
} {
  if (goal === null) {
    return { goal_type: null, goal_value: null };
  }
  if (goal.kind === "minutes") {
    return { goal_type: "minutes", goal_value: goal.minutes };
  }
  return { goal_type: "cycles", goal_value: goal.cycles };
}
