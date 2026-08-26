import {
  summarizeSessionHistory,
  type CalendarDay,
  type SessionHistorySummaryDto,
} from "@/domain";

import type { SessionHistoryRecordDto, SessionHistoryRepository } from "./ports";

export type GetSessionHistoryResult = {
  records: SessionHistoryRecordDto[];
  summary: SessionHistorySummaryDto;
};

const MAX_HISTORY_RECORDS = 5;

export class GetSessionHistory {
  constructor(private readonly repository: SessionHistoryRepository) {}

  async execute(userId: string, today: CalendarDay): Promise<GetSessionHistoryResult> {
    const records = await this.repository.listByUserId(userId);
    return {
      records: records.slice(0, MAX_HISTORY_RECORDS),
      summary: summarizeSessionHistory(records, today),
    };
  }
}
