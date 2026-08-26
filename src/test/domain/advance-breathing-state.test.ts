import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  advanceBreathingState,
  countdownSeconds,
  createIdleBreathingState,
  formatElapsed,
  pauseBreathing,
  phaseProgress,
  resetBreathing,
  sideStates,
  startBreathing,
  type BreathingEngineState,
} from "@/domain";

const settings = BreathingSettings.default();

/** Drive the engine with explicit timestamps in ≤1s steps (no fake timers). */
function play(
  state: BreathingEngineState,
  startMs: number,
  elapsedSeconds: number,
  currentSettings: BreathingSettings,
  stepMs = 1_000,
): BreathingEngineState {
  let current = advanceBreathingState(state, startMs, currentSettings);
  const endMs = startMs + elapsedSeconds * 1000;
  for (let now = startMs + stepMs; now <= endMs; now += stepMs) {
    current = advanceBreathingState(current, now, currentSettings);
  }
  return current;
}

describe("advanceBreathingState", () => {
  it("starts from idle on inhale of cycle 0", () => {
    const started = startBreathing(createIdleBreathingState());
    expect(started.status).toBe("running");
    expect(started.phaseIndex).toBe(0);
    expect(started.cycleCount).toBe(0);
    expect(started.phaseElapsedSeconds).toBe(0);
    expect(started.totalElapsedSeconds).toBe(0);
    expect(started.lastFrameTimeMs).toBeNull();
    expect(started.phaseDurationSeconds).toBeNull();
  });

  it("captures inhale duration on the first advance without consuming elapsed time", () => {
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 10_000, settings);

    expect(first.phaseDurationSeconds).toBe(4);
    expect(first.phaseElapsedSeconds).toBe(0);
    expect(first.totalElapsedSeconds).toBe(0);
    expect(first.phaseIndex).toBe(0);
    expect(first.lastFrameTimeMs).toBe(10_000);
  });

  it("does not restart when already running", () => {
    const running = startBreathing(createIdleBreathingState());
    const advanced = advanceBreathingState(running, 1_000, settings);
    expect(startBreathing(advanced)).toEqual(advanced);
  });

  it("advances inhale into hold after the inhale duration", () => {
    const afterInhale = play(
      startBreathing(createIdleBreathingState()),
      10_000,
      4,
      settings,
    );

    expect(afterInhale.phaseIndex).toBe(1);
    expect(afterInhale.cycleCount).toBe(0);
    expect(afterInhale.phaseElapsedSeconds).toBeCloseTo(0, 8);
    expect(afterInhale.totalElapsedSeconds).toBeCloseTo(4, 8);
  });

  it("enters rest after inhale, hold, and exhale without incrementing the cycle", () => {
    const state = play(
      startBreathing(createIdleBreathingState()),
      0,
      14,
      settings,
    );

    expect(state.phaseIndex).toBe(3);
    expect(state.cycleCount).toBe(0);
    expect(state.phaseElapsedSeconds).toBeCloseTo(0, 8);
  });

  it("counts a new cycle when rest wraps to inhale", () => {
    const state = play(
      startBreathing(createIdleBreathingState()),
      0,
      16,
      settings,
    );

    expect(state.phaseIndex).toBe(0);
    expect(state.cycleCount).toBe(1);
    expect(state.phaseElapsedSeconds).toBeCloseTo(0, 8);
  });

  it("overflows through rest when a single frame covers multiple remaining phases", () => {
    const compact = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 0, compact);
    const nearEndOfInhale = advanceBreathingState(first, 1_900, compact);
    expect(nearEndOfInhale.phaseIndex).toBe(0);

    const overflowed = advanceBreathingState(nearEndOfInhale, 2_900, compact);
    expect(overflowed.phaseIndex).toBe(1);
    expect(overflowed.phaseElapsedSeconds).toBeCloseTo(0, 8);
    expect(overflowed.cycleCount).toBe(0);
  });

  it("caps a backgrounded-tab jump at one second", () => {
    const started = startBreathing(createIdleBreathingState());
    const t0 = 50_000;
    const first = advanceBreathingState(started, t0, settings);
    const jumped = advanceBreathingState(first, t0 + 30_000, settings);

    expect(jumped.phaseElapsedSeconds).toBeCloseTo(1, 8);
    expect(jumped.totalElapsedSeconds).toBeCloseTo(1, 8);
    expect(jumped.phaseIndex).toBe(0);
  });

  it("does not truncate the active phase when its duration is shortened", () => {
    const long = BreathingSettings.fromDto({
      inhale: 15,
      hold: 15,
      exhale: 15,
      rest: 15,
    });
    const state = play(startBreathing(createIdleBreathingState()), 0, 6, long);
    expect(state.phaseIndex).toBe(0);
    expect(state.phaseElapsedSeconds).toBeCloseTo(6, 8);
    expect(state.phaseDurationSeconds).toBe(15);

    const short = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const stillInhale = advanceBreathingState(state, 6_000, short);

    expect(stillInhale.phaseIndex).toBe(0);
    expect(stillInhale.cycleCount).toBe(0);
    expect(stillInhale.phaseElapsedSeconds).toBeCloseTo(6, 8);
    expect(stillInhale.phaseDurationSeconds).toBe(15);
  });

  it("applies changed settings when entering the next phase", () => {
    const duringInhale = play(
      startBreathing(createIdleBreathingState()),
      0,
      3,
      settings,
    );
    expect(duringInhale.phaseIndex).toBe(0);
    expect(duringInhale.phaseDurationSeconds).toBe(4);

    const longerHold = BreathingSettings.fromDto({
      inhale: 4,
      hold: 8,
      exhale: 6,
      rest: 2,
    });
    const intoHold = play(
      duringInhale,
      duringInhale.lastFrameTimeMs!,
      1,
      longerHold,
    );

    expect(intoHold.phaseIndex).toBe(1);
    expect(intoHold.phaseDurationSeconds).toBe(8);
    expect(intoHold.phaseElapsedSeconds).toBeCloseTo(0, 8);

    const stillHold = play(
      intoHold,
      intoHold.lastFrameTimeMs!,
      7,
      longerHold,
    );
    expect(stillHold.phaseIndex).toBe(1);
    expect(stillHold.phaseElapsedSeconds).toBeCloseTo(7, 8);
    expect(stillHold.phaseDurationSeconds).toBe(8);
  });

  it("preserves the active-phase duration snapshot across pause and resume", () => {
    const long = BreathingSettings.fromDto({
      inhale: 15,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
    const running = play(startBreathing(createIdleBreathingState()), 0, 3, long);
    expect(running.phaseDurationSeconds).toBe(15);

    const paused = pauseBreathing(running);
    expect(paused.phaseDurationSeconds).toBe(15);

    const resumed = startBreathing(paused);
    expect(resumed.status).toBe("running");
    expect(resumed.phaseDurationSeconds).toBe(15);

    const short = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const firstResumeFrame = advanceBreathingState(resumed, 90_000, short);
    expect(firstResumeFrame.phaseDurationSeconds).toBe(15);
    expect(firstResumeFrame.phaseElapsedSeconds).toBeCloseTo(3, 8);
    expect(firstResumeFrame.phaseIndex).toBe(0);
  });

  it("returns every running frame with elapsed below the snapshot duration", () => {
    const frames: BreathingEngineState[] = [];
    let current = startBreathing(createIdleBreathingState());
    const t0 = 0;
    current = advanceBreathingState(current, t0, settings);
    frames.push(current);

    for (let now = t0 + 1_000; now <= t0 + 20_000; now += 1_000) {
      current = advanceBreathingState(current, now, settings);
      frames.push(current);
    }

    const shortened = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const last = frames[frames.length - 1]!;
    current = advanceBreathingState(last, last.lastFrameTimeMs!, shortened);
    frames.push(current);
    current = advanceBreathingState(
      current,
      current.lastFrameTimeMs! + 1_000,
      shortened,
    );
    frames.push(current);

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(frame.status).toBe("running");
      expect(frame.phaseDurationSeconds).not.toBeNull();
      expect(frame.phaseElapsedSeconds).toBeLessThan(frame.phaseDurationSeconds!);
    }
  });

  it("preserves progress across pause and resume without applying the paused gap", () => {
    const state = play(
      startBreathing(createIdleBreathingState()),
      0,
      1.5,
      settings,
      500,
    );
    expect(state.phaseElapsedSeconds).toBeCloseTo(1.5, 8);

    const paused = pauseBreathing(state);
    expect(paused.status).toBe("paused");
    expect(paused.phaseElapsedSeconds).toBeCloseTo(1.5, 8);
    expect(paused.lastFrameTimeMs).toBeNull();

    const stillPaused = advanceBreathingState(paused, 80_000, settings);
    expect(stillPaused.phaseElapsedSeconds).toBeCloseTo(1.5, 8);

    const resumed = startBreathing(paused);
    const firstResumeFrame = advanceBreathingState(resumed, 90_000, settings);
    expect(firstResumeFrame.phaseElapsedSeconds).toBeCloseTo(1.5, 8);
    expect(firstResumeFrame.totalElapsedSeconds).toBeCloseTo(1.5, 8);

    const continued = advanceBreathingState(
      firstResumeFrame,
      90_500,
      settings,
    );
    expect(continued.phaseElapsedSeconds).toBeCloseTo(2.0, 8);
    expect(continued.status).toBe("running");
  });

  it("does not mutate the previous state object", () => {
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 0, settings);
    const copy = { ...first };
    advanceBreathingState(first, 2_000, settings);
    expect(first).toEqual(copy);
  });
});

describe("elapsed formatting and countdown", () => {
  it("formats elapsed as zero-padded MM:SS", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(5.9)).toBe("00:05");
    expect(formatElapsed(61)).toBe("01:01");
    expect(formatElapsed(600)).toBe("10:00");
  });

  it("ceils remaining seconds and shows 0 at phase end", () => {
    expect(countdownSeconds(0, 4)).toBe(4);
    expect(countdownSeconds(0.0002, 4)).toBe(4);
    expect(countdownSeconds(3.2, 4)).toBe(1);
    expect(countdownSeconds(3.9999, 4)).toBe(1);
    expect(countdownSeconds(4, 4)).toBe(0);
    expect(countdownSeconds(4.2, 4)).toBe(0);
  });

  it("reports linear phase progress clamped to 1", () => {
    expect(phaseProgress(0, 4)).toBe(0);
    expect(phaseProgress(2, 4)).toBe(0.5);
    expect(phaseProgress(8, 4)).toBe(1);
    expect(phaseProgress(3, 0)).toBe(1);
  });

  it("shows zero countdown for zero-duration phases without dividing by zero", () => {
    expect(countdownSeconds(0, 0)).toBe(0);
    expect(countdownSeconds(0.5, 0)).toBe(0);
  });
});

describe("zero-duration phases", () => {
  it("skips hold and rest immediately for coherence 5-0-5-0", () => {
    const coherence = BreathingSettings.fromDto({
      inhale: 5,
      hold: 0,
      exhale: 5,
      rest: 0,
    });
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 0, coherence);
    expect(first.phaseIndex).toBe(0);
    expect(first.phaseDurationSeconds).toBe(5);

    const afterInhale = play(first, 0, 5, coherence);
    expect(afterInhale.phaseIndex).toBe(2);
    expect(afterInhale.phaseElapsedSeconds).toBeCloseTo(0, 8);
  });

  it("overflows through consecutive zero-duration phases in one frame", () => {
    const triangle = BreathingSettings.fromDto({
      inhale: 2,
      hold: 0,
      exhale: 2,
      rest: 0,
    });
    let state = startBreathing(createIdleBreathingState());
    state = advanceBreathingState(state, 0, triangle);
    state = advanceBreathingState(state, 1_000, triangle);
    state = advanceBreathingState(state, 2_000, triangle);
    expect(state.phaseIndex).toBe(2);
    expect(state.phaseElapsedSeconds).toBeCloseTo(0, 8);

    const overflowed = advanceBreathingState(state, 2_100, triangle);
    expect(overflowed.phaseIndex).toBe(2);
    expect(overflowed.cycleCount).toBe(0);
    expect(overflowed.phaseElapsedSeconds).toBeCloseTo(0.1, 8);
  });
});

describe("reset and side states", () => {
  it("resets to idle with zero stats and pending sides", () => {
    const running = play(
      startBreathing(createIdleBreathingState()),
      0,
      16,
      settings,
    );
    expect(running.cycleCount).toBeGreaterThan(0);

    const reset = resetBreathing();

    expect(reset).toEqual(createIdleBreathingState());
    expect(reset.status).toBe("idle");
    expect(reset.cycleCount).toBe(0);
    expect(reset.phaseDurationSeconds).toBeNull();
    expect(createIdleBreathingState().phaseDurationSeconds).toBeNull();
    expect(sideStates(reset.phaseIndex, reset.status)).toEqual({
      inhale: "pending",
      hold: "pending",
      exhale: "pending",
      rest: "pending",
    });
  });

  it("marks earlier sides completed and the current side active while running", () => {
    expect(sideStates(1)).toEqual({
      inhale: "completed",
      hold: "active",
      exhale: "pending",
      rest: "pending",
    });
    expect(sideStates(3)).toEqual({
      inhale: "completed",
      hold: "completed",
      exhale: "completed",
      rest: "active",
    });
  });
});
