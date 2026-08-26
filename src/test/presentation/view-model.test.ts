import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  advanceBreathingState,
  createIdleBreathingState,
  pauseBreathing,
  startBreathing,
} from "@/domain";
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
    expect(view.svgIdle).toBe(true);
    expect(view.phaseClass).toBe("phase-inhale");
    expect(view.sides.inhale.state).toBe("pending");
    expect(view.sides.hold.state).toBe("pending");
    expect(view.sides.exhale.state).toBe("pending");
    expect(view.sides.rest.state).toBe("pending");
    expect(view.dot).toEqual({ x: 40, y: 360 });
    expect(view.announcement).toBe("INHALE. 4 seconds.");
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
