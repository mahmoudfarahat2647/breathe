import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  type BreathingEngineState,
} from "@/domain";
import { snapshotCompletedSession } from "@/presentation/session-snapshot";

const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function pausedAfterCycles(
  cycleCount: number,
  elapsedSeconds: number,
): BreathingEngineState {
  return {
    status: "paused",
    phaseIndex: 0,
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: elapsedSeconds,
    cycleCount,
    lastFrameTimeMs: null,
    phaseDurationSeconds: 4,
  };
}

describe("snapshotCompletedSession", () => {
  it("returns null when no full cycle completed", () => {
    expect(
      snapshotCompletedSession(
        SESSION_ID,
        pausedAfterCycles(0, 3),
        BreathingSettings.default(),
      ),
    ).toBeNull();
  });

  it("copies duration values so the snapshot cannot mutate live settings", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 5,
      hold: 2,
      exhale: 8,
    });
    const snapshot = snapshotCompletedSession(
      SESSION_ID,
      pausedAfterCycles(2, 28),
      settings,
    );

    expect(snapshot).toEqual({
      id: SESSION_ID,
      cycleCount: 2,
      elapsedSeconds: 28,
      durations: { inhale: 5, hold: 2, exhale: 8 },
    });

    snapshot!.durations.inhale = 15;
    expect(settings.toDto()).toEqual({ inhale: 5, hold: 2, exhale: 8 });
  });
});
