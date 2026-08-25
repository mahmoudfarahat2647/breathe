import type { BreathingSettings } from "@/domain/breathing-settings";
import type { BreathingEngineState } from "@/domain/breathing-engine";
import {
  countdownSeconds,
  currentPhase,
  formatElapsed,
  phaseProgress,
} from "@/domain/breathing-engine";
import {
  PHASE_LABELS,
  PHASES,
  sideStates,
  type Phase,
  type SideState,
} from "@/domain/phase";
import { interpolateDot, strokeDashoffset } from "./geometry";

export type SideView = {
  state: SideState;
  dashoffset: string;
};

export type BreathingViewModel = {
  phase: Phase;
  phaseEn: string;
  phaseAr: string;
  countdown: string;
  durationHint: string;
  cycleCount: string;
  elapsed: string;
  primaryLabel: "Start" | "Resume";
  showPause: boolean;
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
): BreathingViewModel {
  const phase = currentPhase(state);
  const displayedDuration = durationForDisplay(state, settings, phase);
  const progress =
    state.status === "idle"
      ? 0
      : phaseProgress(state.phaseElapsedSeconds, displayedDuration);
  const labels = PHASE_LABELS[phase];
  const sides = sideStates(state.phaseIndex, state.status);

  return {
    phase,
    phaseEn: labels.en,
    phaseAr: labels.ar,
    countdown: String(
      state.status === "idle"
        ? settings.inhale
        : countdownSeconds(state.phaseElapsedSeconds, displayedDuration),
    ),
    durationHint: formatDurationHint(displayedDuration),
    cycleCount: String(displayedCycleCount(state)),
    elapsed: formatElapsed(state.totalElapsedSeconds),
    primaryLabel: state.status === "paused" ? "Resume" : "Start",
    showPause: state.status === "running",
    svgIdle: state.status === "idle",
    phaseClass: `phase-${phase}`,
    sides: {
      inhale: sideView(sides.inhale, progress),
      hold: sideView(sides.hold, progress),
      exhale: sideView(sides.exhale, progress),
    },
    dot: interpolateDot(phase, progress),
    announcement: `${labels.en}. ${displayedDuration} seconds.`,
    stepperValues: {
      inhale: `${settings.inhale}s`,
      hold: `${settings.hold}s`,
      exhale: `${settings.exhale}s`,
    },
    displayedDuration,
  };
}

function displayedCycleCount(state: BreathingEngineState): number {
  if (state.status === "idle") return 0;
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

function sideView(state: SideState, progress: number): SideView {
  return {
    state,
    dashoffset: strokeDashoffset(state, progress),
  };
}

export const PHASE_ORDER = PHASES;
