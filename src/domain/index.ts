/**
 * Domain layer — entities, value objects, and pure breathing rules.
 * Must not import React, Next.js, browser APIs, Supabase, or outer layers.
 */

export { DomainValidationError } from "./errors";
export {
  PHASES,
  PHASE_DURATION_LIMITS,
  MANUAL_STEPPER_LIMITS,
  PHASE_LABELS,
  isPhase,
  nextPhase,
  phaseIndex,
  sideStates,
  type Phase,
  type SideState,
} from "./phase";
export { UserId } from "./user-id";
export {
  BreathingSettings,
  type BreathingSettingsDto,
} from "./breathing-settings";
export {
  BREATHING_PRESET_CATALOG,
  BreathingPreset,
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
  type BreathingPresetDto,
  type BreathingPresetId,
} from "./breathing-preset";
export {
  BreathingPreferences,
  type BreathingPreferencesDto,
} from "./breathing-preferences";
export {
  goalProgress,
  isGoalMet,
  sessionGoalFromDto,
  sessionGoalToDto,
  type GoalProgress,
  type SessionGoal,
  type SessionGoalDto,
} from "./session-goal";
export {
  BreathingSession,
  type BreathingSessionDto,
} from "./breathing-session";
export {
  advanceBreathingState,
  countdownSeconds,
  createIdleBreathingState,
  currentPhase,
  formatElapsed,
  pauseBreathing,
  phaseProgress,
  resetBreathing,
  startBreathing,
  type BreathingEngineState,
  type EngineStatus,
} from "./breathing-engine";
export {
  addCalendarDays,
  calendarDayKey,
  endOfWeek,
  isCalendarDayWithinWeek,
  startOfWeek,
  summarizeSessionHistory,
  type CalendarDay,
  type SessionHistoryRecordDto,
  type SessionHistorySummaryDto,
} from "./session-stats";
