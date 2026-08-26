import { describe, expect, it } from "vitest";

import {
  DomainValidationError,
  advanceBreathingState,
  createIdleBreathingState,
  goalProgress,
  isGoalMet,
  pauseBreathing,
  sessionGoalFromDto,
  sessionGoalToDto,
  startBreathing,
  type BreathingEngineState,
} from "@/domain";
import { BreathingSettings } from "@/domain/breathing-settings";

const settings = BreathingSettings.default();

function play(
  state: BreathingEngineState,
  startMs: number,
  elapsedSeconds: number,
  currentSettings: BreathingSettings,
  activeGoal?: ReturnType<typeof sessionGoalFromDto>,
  stepMs = 1_000,
): BreathingEngineState {
  let current = advanceBreathingState(state, startMs, currentSettings, activeGoal);
  const endMs = startMs + elapsedSeconds * 1000;
  for (let now = startMs + stepMs; now <= endMs; now += stepMs) {
    current = advanceBreathingState(current, now, currentSettings, activeGoal);
  }
  return current;
}

describe("sessionGoalFromDto", () => {
  it("accepts null and maps round-trip", () => {
    expect(sessionGoalFromDto(null)).toBeNull();
    expect(sessionGoalToDto(null)).toBeNull();
  });

  it("validates minute and cycle goals", () => {
    expect(sessionGoalFromDto({ kind: "minutes", minutes: 10 })).toEqual({
      kind: "minutes",
      minutes: 10,
    });
    expect(sessionGoalFromDto({ kind: "cycles", cycles: 5 })).toEqual({
      kind: "cycles",
      cycles: 5,
    });
    expect(() => sessionGoalFromDto({ kind: "minutes", minutes: 0 })).toThrow(
      DomainValidationError,
    );
    expect(() => sessionGoalFromDto({ kind: "cycles", cycles: 101 })).toThrow(
      DomainValidationError,
    );
  });
});

describe("goalProgress", () => {
  it("reports remaining minutes from engine elapsed time", () => {
    const state = {
      totalElapsedSeconds: 30,
      cycleCount: 0,
    };
    const progress = goalProgress(state, { kind: "minutes", minutes: 2 });
    expect(progress?.remainingSeconds).toBe(90);
    expect(progress?.remainingCycles).toBeNull();
    expect(progress?.met).toBe(false);

    // Exact threshold landing
    const thresholdState = { totalElapsedSeconds: 120, cycleCount: 0 };
    const thresholdProgress = goalProgress(thresholdState, { kind: "minutes", minutes: 2 });
    expect(thresholdProgress?.remainingSeconds).toBe(0);
    expect(thresholdProgress?.met).toBe(true);
    expect(isGoalMet(thresholdState, { kind: "minutes", minutes: 2 })).toBe(
      true,
    );
  });

  it("reports remaining cycles from completed cycle count", () => {
    const progress = goalProgress(
      { totalElapsedSeconds: 40, cycleCount: 3 },
      { kind: "cycles", cycles: 5 },
    );
    expect(progress?.remainingCycles).toBe(2);
    expect(progress?.remainingSeconds).toBeNull();
    expect(isGoalMet({ totalElapsedSeconds: 40, cycleCount: 5 }, { kind: "cycles", cycles: 5 })).toBe(
      true,
    );
  });
});

describe("advanceBreathingState with goals", () => {
  it("completes when a minute goal is met using engine elapsed time", () => {
    const compact = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const completed = play(
      startBreathing(createIdleBreathingState()),
      0,
      120,
      compact,
      { kind: "minutes", minutes: 2 },
    );

    expect(completed.status).toBe("completed");
    expect(completed.totalElapsedSeconds).toBeGreaterThanOrEqual(120);
    expect(completed.lastFrameTimeMs).toBeNull();
  });

  it("completes when a cycle goal is met", () => {
    const compact = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const completed = play(
      startBreathing(createIdleBreathingState()),
      0,
      30,
      compact,
      { kind: "cycles", cycles: 5 },
    );

    expect(completed.status).toBe("completed");
    expect(completed.cycleCount).toBeGreaterThanOrEqual(5);
  });

  it("can complete on an overflow frame that crosses the threshold", () => {
    const compact = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 0, compact, { kind: "cycles", cycles: 1 });
    const nearEnd = play(first, first.lastFrameTimeMs!, 5, compact, { kind: "cycles", cycles: 1 }, 500);
    const overflowed = advanceBreathingState(
      nearEnd,
      nearEnd.lastFrameTimeMs! + 1_000,
      compact,
      { kind: "cycles", cycles: 1 },
    );

    expect(overflowed.status).toBe("completed");
    expect(overflowed.cycleCount).toBeGreaterThanOrEqual(1);
  });

  it("preserves progress across pause and resume without counting wall-clock time", () => {
    const goal = { kind: "minutes" as const, minutes: 5 };
    const running = play(
      startBreathing(createIdleBreathingState()),
      0,
      60,
      settings,
      goal,
    );
    expect(running.status).toBe("running");

    const paused = pauseBreathing(running);
    const stillPaused = advanceBreathingState(paused, 999_000, settings, goal);
    expect(stillPaused.status).toBe("paused");
    expect(stillPaused.totalElapsedSeconds).toBeCloseTo(60, 8);

    const resumed = startBreathing(paused);
    const continued = play(resumed, 100_000, 240, settings, goal);
    expect(continued.status).toBe("completed");
    expect(continued.totalElapsedSeconds).toBeGreaterThanOrEqual(300);
  });

  it("does not advance or pause a completed session", () => {
    const completed = play(
      startBreathing(createIdleBreathingState()),
      0,
      120,
      BreathingSettings.fromDto({ inhale: 2, hold: 1, exhale: 2, rest: 1 }),
      { kind: "minutes", minutes: 2 },
    );
    expect(completed.status).toBe("completed");

    const paused = pauseBreathing(completed);
    expect(paused).toEqual(completed);

    const advanced = advanceBreathingState(completed, 999_000, settings, {
      kind: "minutes",
      minutes: 2,
    });
    expect(advanced).toEqual(completed);
  });

  it("starts fresh from completed", () => {
    const completed = play(
      startBreathing(createIdleBreathingState()),
      0,
      120,
      BreathingSettings.fromDto({ inhale: 2, hold: 1, exhale: 2, rest: 1 }),
      { kind: "minutes", minutes: 2 },
    );
    const restarted = startBreathing(completed);

    expect(restarted.status).toBe("running");
    expect(restarted.cycleCount).toBe(0);
    expect(restarted.totalElapsedSeconds).toBe(0);
    expect(restarted.phaseIndex).toBe(0);
  });
});
