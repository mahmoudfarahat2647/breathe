import { DomainValidationError } from "@/domain";
import type { BreathingSessionDto, BreathingSettingsDto } from "@/domain";

function asRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainValidationError("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

function asDurations(value: unknown): BreathingSettingsDto {
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

export function settingsFromRequestBody(body: unknown): BreathingSettingsDto {
  const raw = asRecord(body);
  return {
    inhale: asNumber(raw.inhale, "inhale"),
    hold: asNumber(raw.hold, "hold"),
    exhale: asNumber(raw.exhale, "exhale"),
    rest: asNumber(raw.rest, "rest"),
  };
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
