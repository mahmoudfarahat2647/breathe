export const PHASES = ["inhale", "hold", "exhale", "rest"] as const;

export type Phase = (typeof PHASES)[number];

export type SideState = "pending" | "active" | "completed";

export const PHASE_DURATION_LIMITS: Record<
  Phase,
  { readonly min: number; readonly max: number }
> = {
  inhale: { min: 2, max: 15 },
  hold: { min: 1, max: 15 },
  exhale: { min: 2, max: 15 },
  rest: { min: 1, max: 15 },
};

export const PHASE_LABELS: Record<Phase, string> = {
  inhale: "INHALE",
  hold: "HOLD",
  exhale: "EXHALE",
  rest: "REST",
};

export function isPhase(value: unknown): value is Phase {
  return (
    value === "inhale" ||
    value === "hold" ||
    value === "exhale" ||
    value === "rest"
  );
}

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

export function nextPhase(phase: Phase): Phase {
  return PHASES[(phaseIndex(phase) + 1) % PHASES.length] ?? PHASES[0];
}

export function sideStates(
  currentPhaseIndex: number,
  status: "idle" | "running" | "paused" = "running",
): Record<Phase, SideState> {
  if (status === "idle") {
    return {
      inhale: "pending",
      hold: "pending",
      exhale: "pending",
      rest: "pending",
    };
  }

  return {
    inhale: sideStateFor(0, currentPhaseIndex),
    hold: sideStateFor(1, currentPhaseIndex),
    exhale: sideStateFor(2, currentPhaseIndex),
    rest: sideStateFor(3, currentPhaseIndex),
  };
}

function sideStateFor(index: number, currentPhaseIndex: number): SideState {
  if (index < currentPhaseIndex) return "completed";
  if (index === currentPhaseIndex) return "active";
  return "pending";
}
