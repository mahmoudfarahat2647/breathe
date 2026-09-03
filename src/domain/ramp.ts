import { BreathingSettings } from "./breathing-settings";
import { DomainValidationError } from "./errors";
import { PHASE_DURATION_LIMITS, type Phase } from "./phase";

/**
 * A Ramp is an optional rule that steps phase durations from the active Preset's
 * values toward a target as cycles complete. Off (`null`) by default. Like a
 * Session Goal, the Ramp selected at Start applies for that whole Session.
 */
export type Ramp = null | "wind-down" | "slow-down";

export type RampDto = Ramp;

export type RampRule = {
  readonly id: Exclude<Ramp, null>;
  readonly name: string;
  readonly description: string;
  /** Phases whose duration this ramp lengthens. Hold and Rest are never ramped. */
  readonly phases: readonly Phase[];
  /** Step up by 1s every this many completed cycles. */
  readonly every: number;
  /** Maximum total seconds added on top of the base duration. */
  readonly cap: number;
};

export const RAMP_CATALOG: Record<Exclude<Ramp, null>, RampRule> = {
  "wind-down": {
    id: "wind-down",
    name: "Wind down",
    description: "Exhale lengthens by 1s every 2 cycles, up to +4s.",
    phases: ["exhale"],
    every: 2,
    cap: 4,
  },
  "slow-down": {
    id: "slow-down",
    name: "Slow down",
    description: "Inhale and exhale lengthen by 1s every 3 cycles, up to +3s each.",
    phases: ["inhale", "exhale"],
    every: 3,
    cap: 3,
  },
};

export function rampFromDto(dto: unknown): Ramp {
  if (dto === null || dto === undefined) {
    return null;
  }
  if (typeof dto === "string" && dto in RAMP_CATALOG) {
    return dto as Exclude<Ramp, null>;
  }
  throw new DomainValidationError("Ramp must be null or a known ramp id.");
}

export function rampToDto(ramp: Ramp): RampDto {
  return ramp;
}

/**
 * The settings to breathe by for a given completed-cycle count. Returns the base
 * settings unchanged when the Ramp is Off (or has not stepped yet), so the
 * Ramp-Off path stays byte-identical to the un-ramped engine.
 */
export function settingsForCycle(
  base: BreathingSettings,
  ramp: Ramp,
  completedCycles: number,
): BreathingSettings {
  if (ramp === null) {
    return base;
  }

  const rule = RAMP_CATALOG[ramp];
  const step = Math.min(rule.cap, Math.floor(completedCycles / rule.every));
  if (step <= 0) {
    return base;
  }

  const dto = base.toDto();
  for (const phase of rule.phases) {
    dto[phase] = Math.min(PHASE_DURATION_LIMITS[phase].max, dto[phase] + step);
  }
  return BreathingSettings.fromDto(dto);
}
