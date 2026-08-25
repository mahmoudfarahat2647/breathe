import {
  BreathingSettings,
  type BreathingSettingsDto,
} from "./breathing-settings";
import { DomainValidationError } from "./errors";
import { assertUuid, UserId } from "./user-id";

export type BreathingSessionDto = {
  id: string;
  userId: string;
  cycleCount: number;
  elapsedSeconds: number;
  durations: BreathingSettingsDto;
};

export class BreathingSession {
  readonly id: string;
  readonly userId: UserId;
  readonly cycleCount: number;
  readonly elapsedSeconds: number;
  readonly durations: BreathingSettings;

  private constructor(input: {
    id: string;
    userId: UserId;
    cycleCount: number;
    elapsedSeconds: number;
    durations: BreathingSettings;
  }) {
    this.id = input.id;
    this.userId = input.userId;
    this.cycleCount = input.cycleCount;
    this.elapsedSeconds = input.elapsedSeconds;
    this.durations = input.durations;
    Object.freeze(this);
  }

  static fromDto(dto: BreathingSessionDto): BreathingSession {
    if (typeof dto?.id !== "string") {
      throw new DomainValidationError("Session id must be a UUID.");
    }
    assertUuid(dto.id, "Session id");

    if (!Number.isInteger(dto.cycleCount) || dto.cycleCount < 0) {
      throw new DomainValidationError(
        "Session cycle count must be a non-negative integer.",
      );
    }

    if (
      typeof dto.elapsedSeconds !== "number" ||
      !Number.isFinite(dto.elapsedSeconds) ||
      dto.elapsedSeconds < 0
    ) {
      throw new DomainValidationError(
        "Session elapsed seconds must be a non-negative number.",
      );
    }

    return new BreathingSession({
      id: dto.id,
      userId: UserId.fromDto(dto.userId),
      cycleCount: dto.cycleCount,
      elapsedSeconds: dto.elapsedSeconds,
      durations: BreathingSettings.fromDto({
        inhale: dto.durations?.inhale,
        hold: dto.durations?.hold,
        exhale: dto.durations?.exhale,
      }),
    });
  }

  toDto(): BreathingSessionDto {
    return {
      id: this.id,
      userId: this.userId.toDto(),
      cycleCount: this.cycleCount,
      elapsedSeconds: this.elapsedSeconds,
      durations: this.durations.toDto(),
    };
  }

  hasCompletedCycle(): boolean {
    return this.cycleCount >= 1;
  }
}
