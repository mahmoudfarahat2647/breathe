import type { Phase } from "./phase";

/**
 * Boundary (seconds into the inhale phase) at which the sigh's second,
 * "top-off" inhale segment begins. Recomputed against the live inhale
 * duration passed in, so a Ramp that lengthens inhale keeps the boundary
 * correct without this module knowing anything about Ramp.
 */
export function inhaleTopOffBoundary(
  topOffSeconds: number | null,
  inhaleDuration: number,
): number | null {
  if (topOffSeconds === null) return null;
  return inhaleDuration - topOffSeconds;
}

/**
 * True exactly on the frame that carries `phaseElapsedSeconds` across
 * `boundary` — fires once per inhale phase, not on every frame past it.
 */
export function crossedTopOff(
  prevPhaseElapsedSeconds: number,
  nextPhaseElapsedSeconds: number,
  boundary: number | null,
): boolean {
  if (boundary === null) return false;
  return prevPhaseElapsedSeconds < boundary && nextPhaseElapsedSeconds >= boundary;
}

/**
 * Alternate-nostril cue for Nadi Shodhana. Even completed-cycle counts
 * inhale on the left / exhale on the right; odd counts swap. Hold and Rest
 * carry no nostril (nothing to alternate during a held or resting breath).
 */
export function nostrilFor(
  cycleCount: number,
  phase: Phase,
): "left" | "right" | null {
  if (phase !== "inhale" && phase !== "exhale") return null;
  const isEvenCycle = cycleCount % 2 === 0;
  if (phase === "inhale") {
    return isEvenCycle ? "left" : "right";
  }
  return isEvenCycle ? "right" : "left";
}

/**
 * One short technique-specific hint string for the active preset and phase,
 * or null when the preset carries no technique cue for this moment. Callers
 * merge this with the Ramp hint (see view-model.ts's `hint` field).
 */
export function techniqueHint(
  preset: { topOffSeconds?: number | null; alternateNostrils?: boolean } | null,
  phase: Phase,
  crossedTopOffBoundary: boolean,
  cycleCount: number,
): string | null {
  if (preset === null) return null;

  if (
    preset.topOffSeconds !== null &&
    preset.topOffSeconds !== undefined &&
    phase === "inhale" &&
    crossedTopOffBoundary
  ) {
    return "Top-off breath";
  }

  if (preset.alternateNostrils) {
    const side = nostrilFor(cycleCount, phase);
    if (side === "left") return "Left nostril";
    if (side === "right") return "Right nostril";
  }

  return null;
}
