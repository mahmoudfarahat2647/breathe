import type { BreathingEngineState } from "@/domain/breathing-engine";
import {
  BreathingSettings,
  type BreathingSettingsDto,
} from "@/domain/breathing-settings";

export type ClientSessionSnapshot = {
  id: string;
  cycleCount: number;
  elapsedSeconds: number;
  durations: BreathingSettingsDto;
};

export function snapshotCompletedSession(
  sessionId: string,
  state: BreathingEngineState,
  settings: BreathingSettings,
): ClientSessionSnapshot | null {
  if (state.cycleCount < 1) {
    return null;
  }

  const durations = settings.toDto();
  return {
    id: sessionId,
    cycleCount: state.cycleCount,
    elapsedSeconds: state.totalElapsedSeconds,
    durations: {
      inhale: durations.inhale,
      hold: durations.hold,
      exhale: durations.exhale,
    },
  };
}
