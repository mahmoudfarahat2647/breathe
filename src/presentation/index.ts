/**
 * Presentation layer — React components and browser adapters (RAF, Web Audio).
 * Depends on domain/application ports; does not import infrastructure.
 */

export { AmbientBackground } from "./ambient-background";
export { BreatheApp } from "./breathe-app";
export { BreathingSquare } from "./breathing-square";
export { ControlDeck } from "./control-deck";
export { DurationStepper } from "./duration-stepper";
export {
  createHttpBreathingPersistence,
  SETTINGS_SAVE_DEBOUNCE_MS,
  type BreathingPersistence,
} from "./persistence";
export { snapshotCompletedSession } from "./session-snapshot";
export { useBreathingEngine } from "./use-breathing-engine";
