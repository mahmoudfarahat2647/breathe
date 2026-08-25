import type {
  BreathingSessionDto,
  SessionRepository,
} from "@/application";

import { PersistenceError } from "../errors";
import { sessionDtoToRow } from "../mappers/session-row";
import type { BreathingSupabaseClient } from "../supabase/browser-client";

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly client: BreathingSupabaseClient) {}

  async save(session: BreathingSessionDto): Promise<void> {
    const { error } = await this.client
      .from("breathing_sessions")
      .upsert(sessionDtoToRow(session), {
        onConflict: "id",
        ignoreDuplicates: true,
      });

    if (error) {
      throw new PersistenceError(error.message);
    }
  }
}
