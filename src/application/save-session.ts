import { BreathingSession } from "@/domain";
import type { BreathingSessionDto } from "@/domain";

import type { SessionRepository } from "./ports";

export type SaveSessionResult =
  | { outcome: "saved"; session: BreathingSessionDto }
  | { outcome: "skipped"; reason: "zero-cycles" };

export class SaveSession {
  constructor(private readonly repository: SessionRepository) {}

  async execute(dto: BreathingSessionDto): Promise<SaveSessionResult> {
    const session = BreathingSession.fromDto(dto);
    const snapshot = session.toDto();

    if (!session.hasCompletedCycle()) {
      return { outcome: "skipped", reason: "zero-cycles" };
    }

    await this.repository.save(snapshot);
    return { outcome: "saved", session: snapshot };
  }
}
