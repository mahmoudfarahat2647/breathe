import { DomainValidationError } from "./errors";

export type SessionGoal =
  | null
  | { kind: "minutes"; minutes: number }
  | { kind: "cycles"; cycles: number };

export type SessionGoalDto =
  | null
  | { kind: "minutes"; minutes: number }
  | { kind: "cycles"; cycles: number };

const MINUTES_LIMITS = { min: 1, max: 120 } as const;
const CYCLES_LIMITS = { min: 1, max: 100 } as const;

export type GoalProgress = {
  readonly remainingSeconds: number | null;
  readonly remainingCycles: number | null;
  readonly met: boolean;
};

export function sessionGoalFromDto(dto: SessionGoalDto): SessionGoal {
  if (dto === null) {
    return null;
  }
  if (dto.kind === "minutes") {
    return {
      kind: "minutes",
      minutes: assertGoalValue("minutes", dto.minutes, MINUTES_LIMITS),
    };
  }
  if (dto.kind === "cycles") {
    return {
      kind: "cycles",
      cycles: assertGoalValue("cycles", dto.cycles, CYCLES_LIMITS),
    };
  }
  throw new DomainValidationError("Goal kind must be minutes or cycles.");
}

export function sessionGoalToDto(goal: SessionGoal): SessionGoalDto {
  if (goal === null) {
    return null;
  }
  if (goal.kind === "minutes") {
    return { kind: "minutes", minutes: goal.minutes };
  }
  return { kind: "cycles", cycles: goal.cycles };
}

export function goalProgress(
  state: { totalElapsedSeconds: number; cycleCount: number },
  activeGoal: SessionGoal | null | undefined,
): GoalProgress | null {
  if (!activeGoal) {
    return null;
  }

  if (activeGoal.kind === "minutes") {
    const targetSeconds = activeGoal.minutes * 60;
    const remainingSeconds = Math.max(0, targetSeconds - state.totalElapsedSeconds);
    return {
      remainingSeconds,
      remainingCycles: null,
      met: state.totalElapsedSeconds >= targetSeconds,
    };
  }

  const remainingCycles = Math.max(0, activeGoal.cycles - state.cycleCount);
  return {
    remainingSeconds: null,
    remainingCycles,
    met: state.cycleCount >= activeGoal.cycles,
  };
}

export function isGoalMet(
  state: { totalElapsedSeconds: number; cycleCount: number },
  activeGoal: SessionGoal | null | undefined,
): boolean {
  return goalProgress(state, activeGoal)?.met ?? false;
}

function assertGoalValue(
  label: string,
  value: unknown,
  limits: { min: number; max: number },
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DomainValidationError(`${label} goal must be an integer.`);
  }
  if (value < limits.min || value > limits.max) {
    throw new DomainValidationError(
      `${label} goal must be between ${limits.min} and ${limits.max}.`,
    );
  }
  return value;
}
