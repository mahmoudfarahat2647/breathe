import { DomainValidationError } from "./errors";
import {
  MANUAL_STEPPER_LIMITS,
  PHASE_DURATION_LIMITS,
  type Phase,
} from "./phase";

export type BreathingSettingsDto = {
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
};

const DEFAULT_DURATIONS: BreathingSettingsDto = {
  inhale: 5.5,
  hold: 0,
  exhale: 5.5,
  rest: 0,
};

export class BreathingSettings {
  readonly inhale: number;
  readonly hold: number;
  readonly exhale: number;
  readonly rest: number;

  private constructor(dto: BreathingSettingsDto) {
    this.inhale = dto.inhale;
    this.hold = dto.hold;
    this.exhale = dto.exhale;
    this.rest = dto.rest;
    Object.freeze(this);
  }

  static default(): BreathingSettings {
    return new BreathingSettings(DEFAULT_DURATIONS);
  }

  static fromDto(dto: BreathingSettingsDto): BreathingSettings {
    return new BreathingSettings({
      inhale: assertDuration("inhale", dto?.inhale),
      hold: assertDuration("hold", dto?.hold),
      exhale: assertDuration("exhale", dto?.exhale),
      rest: assertDuration("rest", dto?.rest),
    });
  }

  toDto(): BreathingSettingsDto {
    return {
      inhale: this.inhale,
      hold: this.hold,
      exhale: this.exhale,
      rest: this.rest,
    };
  }

  durationFor(phase: Phase): number {
    return this[phase];
  }

  cycleSeconds(): number {
    return this.inhale + this.hold + this.exhale + this.rest;
  }

  adjust(phase: Phase, direction: number): BreathingSettings {
    const limits = MANUAL_STEPPER_LIMITS[phase];
    const current = this.durationFor(phase);
    const min = Math.min(limits.min, current);
    const snapped =
      direction > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1;
    const next = Math.max(min, Math.min(limits.max, snapped));
    return BreathingSettings.fromDto({
      ...this.toDto(),
      [phase]: next,
    });
  }
}

function isHalfStep(value: number): boolean {
  return Number.isInteger(value * 2);
}

function assertDuration(phase: Phase, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !isHalfStep(value)) {
    throw new DomainValidationError(
      `${phase} duration must be a multiple of 0.5.`,
    );
  }
  const limits = PHASE_DURATION_LIMITS[phase];
  if (value < limits.min || value > limits.max) {
    throw new DomainValidationError(
      `${phase} duration must be between ${limits.min} and ${limits.max}.`,
    );
  }
  return value;
}
