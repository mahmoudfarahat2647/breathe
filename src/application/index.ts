/**
 * Application layer — use cases and repository ports.
 * May depend on domain only (plus sibling application modules).
 * Must not import React, Next.js, browser APIs, or Supabase.
 */

export type {
  BreathingPreferencesDto,
  BreathingSessionDto,
  SessionHistoryRecordDto,
  SessionHistoryRepository,
  SessionRepository,
  SettingsRepository,
} from "./ports";
export { GetSettings } from "./get-settings";
export {
  GetSessionHistory,
  type GetSessionHistoryResult,
} from "./get-session-history";
export { SaveSettings } from "./save-settings";
export { SaveSession, type SaveSessionResult } from "./save-session";
export { ApplyPreset } from "./apply-preset";
