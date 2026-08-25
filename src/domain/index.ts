/**
 * Domain layer — entities, value objects, and pure breathing rules.
 * Must not import React, Next.js, browser APIs, Supabase, or outer layers.
 */

export { DomainValidationError } from "./errors";
export {
  PHASES,
  PHASE_DURATION_LIMITS,
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
