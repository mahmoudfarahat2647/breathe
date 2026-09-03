import type { BreathingSettings } from "./breathing-settings";
import { PHASES, type Phase } from "./phase";
import { settingsForCycle, type Ramp } from "./ramp";
import { isGoalMet, type SessionGoal } from "./session-goal";

export type EngineStatus = "idle" | "running" | "paused" | "completed";

export type BreathingEngineState = {
  readonly status: EngineStatus;
  readonly phaseIndex: number;
  readonly phaseElapsedSeconds: number;
  readonly totalElapsedSeconds: number;
  readonly cycleCount: number;
  readonly lastFrameTimeMs: number | null;
  readonly phaseDurationSeconds: number | null;
};

const MAX_PHASE_OVERFLOWS = PHASES.length + 1;

export function createIdleBreathingState(): BreathingEngineState {
  return freezeState({
    status: "idle",
    phaseIndex: 0,
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: 0,
    cycleCount: 0,
    lastFrameTimeMs: null,
    phaseDurationSeconds: null,
  });
}

export function resetBreathing(): BreathingEngineState {
  return createIdleBreathingState();
}

export function startBreathing(
  state: BreathingEngineState,
): BreathingEngineState {
  if (state.status === "running") {
    return state;
  }

  if (state.status === "paused") {
    return freezeState({
      ...state,
      status: "running",
      lastFrameTimeMs: null,
    });
  }

  return freezeState({
    status: "running",
    phaseIndex: 0,
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: 0,
    cycleCount: 0,
    lastFrameTimeMs: null,
    phaseDurationSeconds: null,
  });
}

export function pauseBreathing(
  state: BreathingEngineState,
): BreathingEngineState {
  if (state.status !== "running") {
    return state;
  }

  return freezeState({
    ...state,
    status: "paused",
    lastFrameTimeMs: null,
  });
}

export function advanceBreathingState(
  state: BreathingEngineState,
  nowMs: number,
  settings: BreathingSettings,
  activeGoal?: SessionGoal | null,
  ramp: Ramp = null,
): BreathingEngineState {
  if (state.status !== "running") {
    return state;
  }

  const durationFor = (phaseIdx: number, completedCycles: number): number =>
    settingsForCycle(settings, ramp, completedCycles).durationFor(
      PHASES[phaseIdx]!,
    );

  let phaseDurationSeconds =
    state.phaseDurationSeconds ??
    durationFor(state.phaseIndex, state.cycleCount);

  const lastFrameTimeMs = state.lastFrameTimeMs ?? nowMs;
  let delta = (nowMs - lastFrameTimeMs) / 1000;
  if (delta > 1) delta = 1;
  if (delta < 0) delta = 0;

  let phaseElapsedSeconds = state.phaseElapsedSeconds + delta;
  const totalElapsedSeconds = state.totalElapsedSeconds + delta;
  let phaseIndex = state.phaseIndex;
  let cycleCount = state.cycleCount;

  let guard = 0;
  while (
    phaseElapsedSeconds >= phaseDurationSeconds &&
    guard < MAX_PHASE_OVERFLOWS
  ) {
    const overflow = phaseElapsedSeconds - phaseDurationSeconds;
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    if (phaseIndex === 0) {
      cycleCount += 1;
    }
    phaseElapsedSeconds = overflow;
    phaseDurationSeconds = durationFor(phaseIndex, cycleCount);
    guard += 1;
  }

  const next = freezeState({
    status: "running",
    phaseIndex,
    phaseElapsedSeconds,
    totalElapsedSeconds,
    cycleCount,
    lastFrameTimeMs: nowMs,
    phaseDurationSeconds,
  });

  if (isGoalMet(next, activeGoal)) {
    return freezeState({
      ...next,
      status: "completed",
      lastFrameTimeMs: null,
    });
  }

  return next;
}

export function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function countdownSeconds(
  phaseElapsedSeconds: number,
  durationSeconds: number,
): number {
  const remaining = Math.max(0, durationSeconds - phaseElapsedSeconds);
  let displayValue = Math.max(1, Math.ceil(remaining - 0.0001));
  if (remaining <= 0.0001) displayValue = 0;
  return displayValue;
}

export function phaseProgress(
  phaseElapsedSeconds: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0) return 1;
  return Math.min(1, phaseElapsedSeconds / durationSeconds);
}

export function currentPhase(state: BreathingEngineState): Phase {
  return PHASES[state.phaseIndex] ?? PHASES[0];
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function freezeState(state: BreathingEngineState): BreathingEngineState {
  return Object.freeze(state);
}
