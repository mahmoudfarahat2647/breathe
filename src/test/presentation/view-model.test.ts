import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  advanceBreathingState,
  createIdleBreathingState,
  pauseBreathing,
  startBreathing,
} from "@/domain";
import { interpolateTriangleDot } from "@/presentation/geometry";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.default();

describe("toBreathingViewModel", () => {
  it("shows idle inhale labels, Start, zero stats, and pending sides", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);

    expect(view.phaseEn).toBe("INHALE");
    expect(view.countdown).toBe("4");
    expect(view.durationHint).toBe("4 seconds");
    expect(view.cycleCount).toBe("0");
    expect(view.elapsed).toBe("00:00");
    expect(view.primaryLabel).toBe("Start");
    expect(view.showPause).toBe(false);
    expect(view.isCompleted).toBe(false);
    expect(view.goalRemaining).toBeNull();
    expect(view.svgIdle).toBe(true);
    expect(view.phaseClass).toBe("phase-inhale");
    expect(view.sides.inhale.state).toBe("pending");
    expect(view.sides.hold.state).toBe("pending");
    expect(view.sides.exhale.state).toBe("pending");
    expect(view.sides.rest.state).toBe("pending");
    expect(view.announcement).toBe("INHALE. 4 seconds.");
  });

  it("positions dot on triangle perimeter when rest is zero", () => {
    const triangleSettings = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    const view = toBreathingViewModel(createIdleBreathingState(), triangleSettings);
    expect(view.dot).toEqual(interpolateTriangleDot("inhale", 0));
    expect(view.dot).toEqual({ x: 40, y: 360 });
  });

  it("begins cycle 1 and removes idle when starting from rest", () => {
    const started = startBreathing(createIdleBreathingState());
    const view = toBreathingViewModel(started, settings);

    expect(view.cycleCount).toBe("1");
    expect(view.svgIdle).toBe(false);
    expect(view.showPause).toBe(true);
    expect(view.sides.inhale.state).toBe("active");
    expect(view.sides.inhale.dashoffset).toBe("1");
  });

  it("shows Resume after pause and keeps progress", () => {
    const started = startBreathing(createIdleBreathingState());
    const first = advanceBreathingState(started, 0, settings);
    const mid = advanceBreathingState(first, 1_000, settings);
    const paused = pauseBreathing(mid);
    const view = toBreathingViewModel(paused, settings);

    expect(view.primaryLabel).toBe("Resume");
    expect(view.showPause).toBe(false);
    expect(view.svgIdle).toBe(false);
    expect(view.countdown).toBe("3");
    expect(view.sides.inhale.state).toBe("active");
  });

  it("uses singular duration hint for one second", () => {
    const oneSecondHold = BreathingSettings.fromDto({
      inhale: 2,
      hold: 1,
      exhale: 2,
      rest: 1,
    });
    const started = startBreathing(createIdleBreathingState());
    let state = advanceBreathingState(started, 0, oneSecondHold);
    state = advanceBreathingState(state, 1_000, oneSecondHold);
    state = advanceBreathingState(state, 2_000, oneSecondHold);
    const view = toBreathingViewModel(state, oneSecondHold);

    expect(view.phaseEn).toBe("HOLD");
    expect(view.durationHint).toBe("1 second");
  });

  it("shows remaining goal time while a minute goal is active", () => {
    const running = {
      ...startBreathing(createIdleBreathingState()),
      totalElapsedSeconds: 60,
      phaseElapsedSeconds: 0,
      phaseIndex: 0,
      lastFrameTimeMs: 60_000,
      phaseDurationSeconds: 4,
    };
    const view = toBreathingViewModel(running, settings, { kind: "minutes", minutes: 5 });

    expect(view.goalRemaining).toBe("04:00");
    expect(view.isCompleted).toBe(false);
  });

  it("shows completed state without pause controls", () => {
    const completed = {
      ...startBreathing(createIdleBreathingState()),
      status: "completed" as const,
      cycleCount: 2,
      totalElapsedSeconds: 120,
      phaseElapsedSeconds: 1,
      phaseIndex: 0,
      lastFrameTimeMs: null,
      phaseDurationSeconds: 4,
    };
    const view = toBreathingViewModel(completed, settings);

    expect(view.isCompleted).toBe(true);
    expect(view.showPause).toBe(false);
    expect(view.primaryLabel).toBe("Start");
    expect(view.goalRemaining).toBeNull();
    expect(view.cycleCount).toBe("2");
  });

  it("formats stepper values with an s suffix", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    expect(view.stepperValues).toEqual({
      inhale: "4s",
      hold: "4s",
      exhale: "6s",
      rest: "2s",
    });
  });
});
