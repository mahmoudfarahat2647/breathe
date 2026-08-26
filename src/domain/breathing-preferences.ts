import {
  BreathingSettings,
  type BreathingSettingsDto,
} from "./breathing-settings";
import {
  sessionGoalFromDto,
  sessionGoalToDto,
  type SessionGoal,
  type SessionGoalDto,
} from "./session-goal";

export type BreathingPreferencesDto = {
  durations: BreathingSettingsDto;
  goal: SessionGoalDto;
};

export class BreathingPreferences {
  readonly settings: BreathingSettings;
  readonly goal: SessionGoal;

  private constructor(settings: BreathingSettings, goal: SessionGoal) {
    this.settings = settings;
    this.goal = goal;
    Object.freeze(this);
  }

  static default(): BreathingPreferences {
    return new BreathingPreferences(BreathingSettings.default(), null);
  }

  static fromDto(dto: BreathingPreferencesDto): BreathingPreferences {
    return new BreathingPreferences(
      BreathingSettings.fromDto(dto.durations),
      sessionGoalFromDto(dto.goal),
    );
  }

  toDto(): BreathingPreferencesDto {
    return {
      durations: this.settings.toDto(),
      goal: sessionGoalToDto(this.goal),
    };
  }

  withSettings(settings: BreathingSettings): BreathingPreferences {
    return new BreathingPreferences(settings, this.goal);
  }

  withGoal(goal: SessionGoal): BreathingPreferences {
    return new BreathingPreferences(this.settings, goal);
  }
}
