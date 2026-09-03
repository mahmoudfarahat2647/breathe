import {
  BreathingSettings,
  type BreathingSettingsDto,
} from "./breathing-settings";
import {
  rampFromDto,
  rampToDto,
  type Ramp,
  type RampDto,
} from "./ramp";
import {
  sessionGoalFromDto,
  sessionGoalToDto,
  type SessionGoal,
  type SessionGoalDto,
} from "./session-goal";

export type BreathingPreferencesDto = {
  durations: BreathingSettingsDto;
  goal: SessionGoalDto;
  ramp: RampDto;
};

export class BreathingPreferences {
  readonly settings: BreathingSettings;
  readonly goal: SessionGoal;
  readonly ramp: Ramp;

  private constructor(
    settings: BreathingSettings,
    goal: SessionGoal,
    ramp: Ramp,
  ) {
    this.settings = settings;
    this.goal = goal;
    this.ramp = ramp;
    Object.freeze(this);
  }

  static default(): BreathingPreferences {
    return new BreathingPreferences(BreathingSettings.default(), null, null);
  }

  static fromDto(dto: BreathingPreferencesDto): BreathingPreferences {
    return new BreathingPreferences(
      BreathingSettings.fromDto(dto.durations),
      sessionGoalFromDto(dto.goal),
      rampFromDto(dto.ramp),
    );
  }

  toDto(): BreathingPreferencesDto {
    return {
      durations: this.settings.toDto(),
      goal: sessionGoalToDto(this.goal),
      ramp: rampToDto(this.ramp),
    };
  }

  withSettings(settings: BreathingSettings): BreathingPreferences {
    return new BreathingPreferences(settings, this.goal, this.ramp);
  }

  withGoal(goal: SessionGoal): BreathingPreferences {
    return new BreathingPreferences(this.settings, goal, this.ramp);
  }

  withRamp(ramp: Ramp): BreathingPreferences {
    return new BreathingPreferences(this.settings, this.goal, ramp);
  }
}
