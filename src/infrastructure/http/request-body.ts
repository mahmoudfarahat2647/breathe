import { DomainValidationError, rampFromDto } from "@/domain";
import type { BreathingPreferencesDto, BreathingSessionDto } from "@/domain";

function asRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainValidationError("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

function asDurations(value: unknown): BreathingPreferencesDto["durations"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainValidationError("Durations must be an object.");
  }
  const durations = value as Record<string, unknown>;
  return {
    inhale: asNumber(durations.inhale, "inhale"),
    hold: asNumber(durations.hold, "hold"),
    exhale: asNumber(durations.exhale, "exhale"),
    rest: asNumber(durations.rest, "rest"),
  };
}

function asGoal(value: unknown): BreathingPreferencesDto["goal"] {
  if (value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new DomainValidationError("Goal must be an object or null.");
  }
  const goal = value as Record<string, unknown>;
  const kind = goal.kind;
  if (kind === "minutes") {
    return {
      kind: "minutes",
      minutes: asNumber(goal.minutes, "minutes"),
    };
  }
  if (kind === "cycles") {
    return {
      kind: "cycles",
      cycles: asNumber(goal.cycles, "cycles"),
    };
  }
  throw new DomainValidationError("Goal kind must be minutes or cycles.");
}

function asRamp(value: unknown): BreathingPreferencesDto["ramp"] {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return rampFromDto(value);
  }
  throw new DomainValidationError("Ramp must be a string or null.");
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DomainValidationError(`${label} must be a number.`);
  }
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new DomainValidationError(`${label} must be a string.`);
  }
  return value;
}

export function preferencesFromRequestBody(
  body: unknown,
  fallbackGoal: BreathingPreferencesDto["goal"] = null,
  fallbackRamp: BreathingPreferencesDto["ramp"] = null,
): BreathingPreferencesDto {
  const raw = asRecord(body);
  if ("durations" in raw) {
    return {
      durations: asDurations(raw.durations),
      goal: "goal" in raw && raw.goal !== undefined ? asGoal(raw.goal) : fallbackGoal,
      ramp: "ramp" in raw && raw.ramp !== undefined ? asRamp(raw.ramp) : fallbackRamp,
    };
  }

  return {
    durations: {
      inhale: asNumber(raw.inhale, "inhale"),
      hold: asNumber(raw.hold, "hold"),
      exhale: asNumber(raw.exhale, "exhale"),
      rest: asNumber(raw.rest, "rest"),
    },
    goal: "goal" in raw && raw.goal !== undefined ? asGoal(raw.goal) : fallbackGoal,
    ramp: "ramp" in raw && raw.ramp !== undefined ? asRamp(raw.ramp) : fallbackRamp,
  };
}

/** @deprecated Use preferencesFromRequestBody for the aggregate settings payload. */
export function settingsFromRequestBody(
  body: unknown,
): BreathingPreferencesDto["durations"] {
  return preferencesFromRequestBody(body).durations;
}

export function sessionFromRequestBody(
  body: unknown,
  userId: string,
): BreathingSessionDto {
  const raw = asRecord(body);
  return {
    id: asString(raw.id, "id"),
    userId,
    cycleCount: asNumber(raw.cycleCount, "cycleCount"),
    elapsedSeconds: asNumber(raw.elapsedSeconds, "elapsedSeconds"),
    durations: asDurations(raw.durations),
  };
}
