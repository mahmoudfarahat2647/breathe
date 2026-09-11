import { BreathingSession } from "@/domain";
import type { BreathingSessionDto } from "@/domain";

import type { SessionRepository } from "./ports";

export const MAX_SESSIONS_PER_USER = 2000;

export type SaveSessionResult =
  | { outcome: "saved"; session: BreathingSessionDto }
  | { outcome: "skipped"; reason: "zero-cycles" }
  | { outcome: "rejected"; reason: "quota-exceeded" };

export class SaveSession {
  constructor(private readonly repository: SessionRepository) {}

  async execute(dto: BreathingSessionDto): Promise<SaveSessionResult> {
    const session = BreathingSession.fromDto(dto);
    const snapshot = session.toDto();

    if (!session.hasCompletedCycle()) {
      return { outcome: "skipped", reason: "zero-cycles" };
    }

    const count = await this.repository.countByUserId(snapshot.userId);
    if (count >= MAX_SESSIONS_PER_USER) {
      return { outcome: "rejected", reason: "quota-exceeded" };
    }

    await this.repository.save(snapshot);
    return { outcome: "saved", session: snapshot };
  }
}
