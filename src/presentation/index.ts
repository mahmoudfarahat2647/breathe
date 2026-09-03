/**
 * Presentation layer — React components and browser adapters (RAF, Web Audio).
 * Depends on domain/application ports; does not import infrastructure.
 */

export { BreatheApp } from "./breathe-app";
export { BreathingStage } from "./breathing-stage";
export { BreathingTriangle } from "./breathing-triangle";
export { DurationStepper } from "./duration-stepper";
export { GoalPicker } from "./goal-picker";
export { RampPicker } from "./ramp-picker";
export { HistoryPanel } from "./history-panel";
export {
  createHttpBreathingPersistence,
  SETTINGS_SAVE_DEBOUNCE_MS,
  type BreathingPersistence,
} from "./persistence";
export { snapshotCompletedSession } from "./session-snapshot";
export {
  createHttpSessionHistorySource,
  resolveClientTimeZone,
  type SessionHistoryPayload,
  type SessionHistorySource,
} from "./session-history-source";
export { useBreathingEngine } from "./use-breathing-engine";
