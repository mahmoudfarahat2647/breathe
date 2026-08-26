import { describe, expect, it } from "vitest";

import { GetSessionHistory } from "@/application";
import type { SessionHistoryRecordDto, SessionHistoryRepository } from "@/application";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TODAY = { year: 2026, month: 8, day: 26 };

function record(
  day: SessionHistoryRecordDto["calendarDay"],
): SessionHistoryRecordDto {
  return {
    cycleCount: 2,
    elapsedSeconds: 60,
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    createdAtEpochMs: Date.UTC(day.year, day.month - 1, day.day),
    calendarDay: day,
  };
}

function memoryHistory(
  records: SessionHistoryRecordDto[],
): SessionHistoryRepository {
  return {
    async listByUserId() {
      return records;
    },
  };
}

describe("GetSessionHistory", () => {
  it("returns records and a summary for the provided today anchor", async () => {
    const useCase = new GetSessionHistory(
      memoryHistory([
        record({ year: 2026, month: 8, day: 24 }),
        record({ year: 2026, month: 8, day: 26 }),
      ]),
    );

    await expect(useCase.execute(USER_ID, TODAY)).resolves.toEqual({
      records: [
        record({ year: 2026, month: 8, day: 24 }),
        record({ year: 2026, month: 8, day: 26 }),
      ],
      summary: {
        totalSessions: 2,
        totalElapsedSeconds: 120,
        sessionsThisWeek: 2,
        currentStreak: 1,
      },
    });
  });

  it("caps returned records to 5 while computing summary over all records", async () => {
    const allRecords = Array.from({ length: 8 }, (_, i) =>
      record({ year: 2026, month: 8, day: 20 + i }),
    );
    const useCase = new GetSessionHistory(memoryHistory(allRecords));
    const result = await useCase.execute(USER_ID, TODAY);

    expect(result.records).toHaveLength(5);
    expect(result.records).toEqual(allRecords.slice(0, 5));
    expect(result.summary.totalSessions).toBe(8);
  });
});
