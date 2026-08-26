/**
 * Presentation layer — React components and browser adapters (RAF, Web Audio).
 * Depends on domain/application ports; does not import infrastructure.
 */

export { AmbientBackground } from "./ambient-background";
export { BreatheApp } from "./breathe-app";
export { BreathingSquare } from "./breathing-square";
export { BreathingTriangle } from "./breathing-triangle";
export { ControlDeck } from "./control-deck";
export { DurationStepper } from "./duration-stepper";
export { PresetPicker } from "./preset-picker";
export { GoalPicker } from "./goal-picker";
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
