import type {
  BreathingPreferencesDto,
  BreathingSessionDto,
  SessionHistoryRecordDto,
} from "@/domain";

export type {
  BreathingPreferencesDto,
  BreathingSessionDto,
  SessionHistoryRecordDto,
};

export interface SettingsRepository {
  getByUserId(userId: string): Promise<BreathingPreferencesDto | null>;
  save(userId: string, preferences: BreathingPreferencesDto): Promise<void>;
}

export interface SessionRepository {
  save(session: BreathingSessionDto): Promise<void>;
}

export interface SessionHistoryRepository {
  listByUserId(userId: string): Promise<SessionHistoryRecordDto[]>;
}
