import type { BreathingSettings } from "@/domain/breathing-settings";
import type { BreathingEngineState } from "@/domain/breathing-engine";
import {
  countdownSeconds,
  currentPhase,
  formatElapsed,
  phaseProgress,
} from "@/domain/breathing-engine";
import { goalProgress, type SessionGoal } from "@/domain/session-goal";
import type { Ramp } from "@/domain/ramp";
import {
  PHASE_LABELS,
  PHASES,
  sideStates,
  type Phase,
  type SideState,
} from "@/domain/phase";
import {
  interpolateTriangleDot,
  strokeDashoffset,
} from "./geometry";

export type SideView = {
  state: SideState;
  dashoffset: string;
};

export type BreathingViewModel = {
  phase: Phase;
  phaseEn: string;
  countdown: string;
  durationHint: string;
  cycleCount: string;
  elapsed: string;
  goalRemaining: string | null;
  rampHint: string | null;
  primaryLabel: "Start" | "Resume";
  showPause: boolean;
  isCompleted: boolean;
  svgIdle: boolean;
  phaseClass: `phase-${Phase}`;
  sides: Record<Phase, SideView>;
  dot: { x: number; y: number };
  announcement: string;
  stepperValues: Record<Phase, string>;
  displayedDuration: number;
};

export function toBreathingViewModel(
  state: BreathingEngineState,
  settings: BreathingSettings,
  activeGoal: SessionGoal | null = null,
  activeRamp: Ramp = null,
): BreathingViewModel {
  const phase = currentPhase(state);
  const displayedDuration = durationForDisplay(state, settings, phase);
  const progress =
    state.status === "idle"
      ? 0
      : phaseProgress(state.phaseElapsedSeconds, displayedDuration);
  const label = PHASE_LABELS[phase];
  const sides = sideStates(state.phaseIndex, state.status);
  const progressInfo = goalProgress(state, activeGoal);
  const triangleMode = settings.rest === 0;
  const dotPhase =
    triangleMode && phase === "rest" ? ("exhale" as const) : phase;
  const dotProgress =
    triangleMode && phase === "rest" ? 1 : progress;

  return {
    phase,
    phaseEn: label,
    countdown: String(
      state.status === "idle"
        ? settings.inhale
        : countdownSeconds(state.phaseElapsedSeconds, displayedDuration),
    ),
    durationHint: formatDurationHint(displayedDuration),
    cycleCount: String(displayedCycleCount(state)),
    elapsed: formatElapsed(state.totalElapsedSeconds),
    goalRemaining: formatGoalRemaining(progressInfo),
    rampHint: formatRampHint(state, settings, phase, displayedDuration, activeRamp),
    primaryLabel: state.status === "paused" ? "Resume" : "Start",
    showPause: state.status === "running",
    isCompleted: state.status === "completed",
    svgIdle: state.status === "idle",
    phaseClass: `phase-${phase}`,
    sides: {
      inhale: sideView(sides.inhale, progress),
      hold: sideView(sides.hold, progress),
      exhale: sideView(sides.exhale, progress),
      rest: sideView(sides.rest, progress),
    },
    dot: triangleMode
      ? interpolateTriangleDot(
          dotPhase === "rest" ? "exhale" : dotPhase,
          dotProgress,
        )
      // Only read by BreathingTriangle (rest === 0); the square Stage positions its own dot.
      : { x: 0, y: 0 },
    announcement: `${label}. ${displayedDuration} seconds.`,
    stepperValues: {
      inhale: `${settings.inhale}s`,
      hold: `${settings.hold}s`,
      exhale: `${settings.exhale}s`,
      rest: `${settings.rest}s`,
    },
    displayedDuration,
  };
}

function displayedCycleCount(state: BreathingEngineState): number {
  if (state.status === "idle") return 0;
  if (state.status === "completed") return state.cycleCount;
  return state.cycleCount + 1;
}

function durationForDisplay(
  state: BreathingEngineState,
  settings: BreathingSettings,
  phase: Phase,
): number {
  if (state.status === "idle") return settings.inhale;
  return state.phaseDurationSeconds ?? settings.durationFor(phase);
}

function formatDurationHint(seconds: number): string {
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

const RAMP_HINT_PHASE_LABELS: Record<Phase, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
  rest: "Rest",
};

/**
 * A short "Exhale now 8s" line shown while a Ramp has lengthened the live phase
 * past its base duration. Keyed on `activeRamp`, not the duration alone: a manual
 * mid-phase stepper edit with Ramp Off can also make the snapshotted duration
 * differ from the (just-changed) base, and that must not surface a hint.
 */
function formatRampHint(
  state: BreathingEngineState,
  settings: BreathingSettings,
  phase: Phase,
  displayedDuration: number,
  activeRamp: Ramp,
): string | null {
  if (activeRamp === null) return null;
  if (state.status !== "running" && state.status !== "paused") return null;
  if (displayedDuration <= settings.durationFor(phase)) return null;
  return `${RAMP_HINT_PHASE_LABELS[phase]} now ${displayedDuration}s`;
}

function formatGoalRemaining(
  progressInfo: ReturnType<typeof goalProgress>,
): string | null {
  if (!progressInfo || progressInfo.met) {
    return null;
  }
  if (progressInfo.remainingSeconds !== null) {
    return formatElapsed(progressInfo.remainingSeconds);
  }
  if (progressInfo.remainingCycles !== null) {
    return String(progressInfo.remainingCycles);
  }
  return null;
}

function sideView(state: SideState, progress: number): SideView {
  return {
    state,
    dashoffset: strokeDashoffset(state, progress),
  };
}

export const PHASE_ORDER = PHASES;
