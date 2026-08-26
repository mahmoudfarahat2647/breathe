import type { BreathingSessionDto, SessionHistoryRecordDto } from "@/domain";

import type { BreathingSessionRow } from "../supabase/database.types";
import { calendarDayFromIso } from "../time/timezone";

export function sessionRowToDto(
  row: Pick<
    BreathingSessionRow,
    | "id"
    | "user_id"
    | "cycle_count"
    | "elapsed_seconds"
    | "inhale_seconds"
    | "hold_seconds"
    | "exhale_seconds"
    | "rest_seconds"
  >,
): BreathingSessionDto {
  return {
    id: row.id,
    userId: row.user_id,
    cycleCount: row.cycle_count,
    elapsedSeconds: Number(row.elapsed_seconds),
    durations: {
      inhale: row.inhale_seconds,
      hold: row.hold_seconds,
      exhale: row.exhale_seconds,
      rest: row.rest_seconds,
    },
  };
}

export function sessionDtoToRow(dto: BreathingSessionDto): {
  id: string;
  user_id: string;
  cycle_count: number;
  elapsed_seconds: number;
  inhale_seconds: number;
  hold_seconds: number;
  exhale_seconds: number;
  rest_seconds: number;
} {
  return {
    id: dto.id,
    user_id: dto.userId,
    cycle_count: dto.cycleCount,
    elapsed_seconds: dto.elapsedSeconds,
    inhale_seconds: dto.durations.inhale,
    hold_seconds: dto.durations.hold,
    exhale_seconds: dto.durations.exhale,
    rest_seconds: dto.durations.rest,
  };
}

export type SessionHistoryRow = Pick<
  BreathingSessionRow,
  | "cycle_count"
  | "elapsed_seconds"
  | "inhale_seconds"
  | "hold_seconds"
  | "exhale_seconds"
  | "rest_seconds"
  | "created_at"
>;

export function sessionRowToHistoryRecord(
  row: SessionHistoryRow,
  timeZone: string,
): SessionHistoryRecordDto {
  const createdAtEpochMs = Date.parse(row.created_at);
  return {
    cycleCount: row.cycle_count,
    elapsedSeconds: Number(row.elapsed_seconds),
    durations: {
      inhale: row.inhale_seconds,
      hold: row.hold_seconds,
      exhale: row.exhale_seconds,
      rest: row.rest_seconds,
    },
    createdAtEpochMs,
    calendarDay: calendarDayFromIso(row.created_at, timeZone),
  };
}
