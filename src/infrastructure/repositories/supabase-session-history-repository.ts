import type {
  SessionHistoryRecordDto,
  SessionHistoryRepository,
} from "@/application";

import { PersistenceError } from "../errors";
import { sessionRowToHistoryRecord } from "../mappers/session-row";
import type { BreathingSupabaseClient } from "../supabase/server-client";

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

export class SupabaseSessionHistoryRepository implements SessionHistoryRepository {
  constructor(
    private readonly client: BreathingSupabaseClient,
    private readonly timeZone: string,
  ) {}

  async listByUserId(userId: string): Promise<SessionHistoryRecordDto[]> {
    const records: SessionHistoryRecordDto[] = [];
    let offset = 0;
    let pagesFetched = 0;

    while (pagesFetched < MAX_PAGES) {
      const { data, error } = await this.client
        .from("breathing_sessions")
        .select(
          "cycle_count, elapsed_seconds, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new PersistenceError(error.message);
      }

      const page = data ?? [];
      for (const row of page) {
        records.push(sessionRowToHistoryRecord(row, this.timeZone));
      }

      pagesFetched += 1;
      if (page.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }

    return records;
  }
}
