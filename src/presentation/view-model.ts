import type { BreathingSettings } from "@/domain/breathing-settings";
import type { BreathingPresetDto } from "@/domain/breathing-preset";
import type { BreathingEngineState } from "@/domain/breathing-engine";
import {
  countdownSeconds,
  currentPhase,
  formatElapsed,
  phaseProgress,
} from "@/domain/breathing-engine";
import { goalProgress, type SessionGoal } from "@/domain/session-goal";
import type { Ramp } from "@/domain/ramp";
import { inhaleTopOffBoundary, techniqueHint } from "@/domain/technique";
import {
  PHASE_LABELS,
  PHASES,
  sideStates,
  type Phase,
  type SideState,
} from "@/domain/phase";
import { strokeDashoffset } from "./geometry";

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
  techniqueHint: string | null;
  hint: string | null;
  topOffFraction: number | null;
  primaryLabel: "Start" | "Resume";
  showPause: boolean;
  isCompleted: boolean;
  svgIdle: boolean;
  phaseClass: `phase-${Phase}`;
  sides: Record<Phase, SideView>;
  announcement: string;
  stepperValues: Record<Phase, string>;
  displayedDuration: number;
};

export function toBreathingViewModel(
  state: BreathingEngineState,
  settings: BreathingSettings,
  activeGoal: SessionGoal | null = null,
  activeRamp: Ramp = null,
  activePreset: BreathingPresetDto | null = null,
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

  const rampHint = formatRampHint(
    state,
    settings,
    phase,
    displayedDuration,
    activeRamp,
  );
  const crossedBoundary = crossedTopOffForDisplay(state, activePreset);
  const techniqueHintText =
    state.status === "idle" || state.status === "completed"
      ? null
      : techniqueHint(activePreset, phase, crossedBoundary, state.cycleCount);
  const hint =
    [rampHint, techniqueHintText].filter((v): v is string => Boolean(v)).join(" · ") ||
    null;

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
    rampHint,
    techniqueHint: techniqueHintText,
    hint,
    topOffFraction: computeTopOffFraction(activePreset, settings, state),
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
    announcement: formatAnnouncement(label, displayedDuration, techniqueHintText),
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

/**
 * Whether the displayed inhale has crossed its top-off boundary.
 * Used for view rendering (technique hint): is the boundary reached right now.
 * Idle/non-running states never show it.
 */
function crossedTopOffForDisplay(
  state: BreathingEngineState,
  activePreset: BreathingPresetDto | null,
): boolean {
  if (activePreset === null || activePreset.topOffSeconds === null) return false;
  if (state.status !== "running" && state.status !== "paused") return false;
  const phase = currentPhase(state);
  if (phase !== "inhale") return false;
  const duration = state.phaseDurationSeconds ?? activePreset.durations.inhale;
  const boundary = inhaleTopOffBoundary(activePreset.topOffSeconds, duration);
  if (boundary === null) return false;
  return state.phaseElapsedSeconds >= boundary;
}

/**
 * Ramp-safe: while the phase is actively inhale and running/paused, uses the
 * live snapshotted phaseDurationSeconds (the same value the RAF loop's
 * boundary is computed against) so the Stage tick and the cue always agree
 * on where the boundary is — including under an active Ramp.
 * Present only while inhale is the active phase and the preset has topOffSeconds.
 */
function computeTopOffFraction(
  activePreset: BreathingPresetDto | null,
  settings: BreathingSettings,
  state: BreathingEngineState,
): number | null {
  if (activePreset === null || activePreset.topOffSeconds === null) return null;
  const phase = currentPhase(state);
  if (phase !== "inhale") return null;
  const liveInhaleDuration =
    (state.status === "running" || state.status === "paused") &&
    state.phaseDurationSeconds !== null
      ? state.phaseDurationSeconds
      : settings.inhale;
  const boundary = inhaleTopOffBoundary(activePreset.topOffSeconds, liveInhaleDuration);
  if (boundary === null || liveInhaleDuration <= 0) return null;
  return boundary / liveInhaleDuration;
}

function formatAnnouncement(
  phaseLabel: string,
  displayedDuration: number,
  techniqueHintText: string | null,
): string {
  const base = `${phaseLabel}. ${displayedDuration} seconds.`;
  if (techniqueHintText === "Left nostril") return `${base} Left nostril.`;
  if (techniqueHintText === "Right nostril") return `${base} Right nostril.`;
  return base;
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
