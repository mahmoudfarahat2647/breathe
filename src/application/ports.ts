import type {
  BreathingSessionDto,
  BreathingSettingsDto,
} from "@/domain";

export type { BreathingSessionDto, BreathingSettingsDto };

export interface SettingsRepository {
  getByUserId(userId: string): Promise<BreathingSettingsDto | null>;
  save(userId: string, settings: BreathingSettingsDto): Promise<void>;
}

export interface SessionRepository {
  save(session: BreathingSessionDto): Promise<void>;
}
