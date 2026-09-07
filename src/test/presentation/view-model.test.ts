import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  advanceBreathingState,
  createIdleBreathingState,
  pauseBreathing,
  startBreathing,
} from "@/domain";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.fromDto({
  inhale: 4,
  hold: 4,
  exhale: 6,
  rest: 2,
});

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

  it("renders four pending sides for a zero-rest preset (Square is the only shape)", () => {
    const noRestSettings = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    const view = toBreathingViewModel(createIdleBreathingState(), noRestSettings);
    expect(Object.keys(view.sides)).toEqual(["inhale", "hold", "exhale", "rest"]);
    expect(view.sides.rest.state).toBe("pending");
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

  describe("rampHint", () => {
    const rampedExhale = {
      ...startBreathing(createIdleBreathingState()),
      status: "running" as const,
      phaseIndex: 2,
      phaseElapsedSeconds: 1,
      totalElapsedSeconds: 30,
      cycleCount: 2,
      lastFrameTimeMs: 30_000,
      phaseDurationSeconds: 7,
    };

    it("names the phase and its ramped duration when a Ramp is active", () => {
      const view = toBreathingViewModel(rampedExhale, settings, null, "wind-down");
      expect(view.rampHint).toBe("Exhale now 7s");
    });

    it("names the lengthened inhale when Slow Down is active", () => {
      const rampedInhale = {
        ...rampedExhale,
        phaseIndex: 0,
        phaseDurationSeconds: 5,
      };
      const view = toBreathingViewModel(
        rampedInhale,
        settings,
        null,
        "slow-down",
      );
      expect(view.rampHint).toBe("Inhale now 5s");
    });

    it("is null when idle", () => {
      const view = toBreathingViewModel(
        createIdleBreathingState(),
        settings,
        null,
        "wind-down",
      );
      expect(view.rampHint).toBeNull();
    });

    it("is null when no Ramp is active even if the displayed duration differs from base", () => {
      // The Ramp-Off regression: a manual mid-phase stepper edit can make the
      // displayed (snapshotted) duration differ from the just-changed base.
      const view = toBreathingViewModel(rampedExhale, settings, null, null);
      expect(view.rampHint).toBeNull();
    });

    it("is null while a Ramp is active but the phase is still at its base duration", () => {
      const view = toBreathingViewModel(
        { ...rampedExhale, phaseDurationSeconds: 6 },
        settings,
        null,
        "wind-down",
      );
      expect(view.rampHint).toBeNull();
    });
  });

  describe("hint — technique cues and merge", () => {
    const SIGH_PRESET = {
      id: "acute-de-stress" as const,
      name: "Acute De-Stress",
      description: "Physiological sigh.",
      durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
      recommendedCycles: 4,
      topOffSeconds: 1,
      alternateNostrils: false,
    };

    const NOSTRIL_PRESET = {
      id: "mood-elevation" as const,
      name: "Mood Elevation",
      description: "Nadi Shodhana.",
      durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
      recommendedCycles: 10,
      topOffSeconds: null,
      alternateNostrils: true,
    };

    it("shows the top-off hint once the running inhale has crossed the boundary", () => {
      const runningPastBoundary = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 2.2,
        totalElapsedSeconds: 2.2,
        cycleCount: 0,
        lastFrameTimeMs: 2_200,
        phaseDurationSeconds: 3,
      };
      const view = toBreathingViewModel(
        runningPastBoundary,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.techniqueHint).toBe("Top-off breath");
      expect(view.hint).toBe("Top-off breath");
    });

    it("does not show top-off hint before crossing the boundary", () => {
      const runningBeforeBoundary = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 1.5,
        totalElapsedSeconds: 1.5,
        cycleCount: 0,
        lastFrameTimeMs: 1_500,
        phaseDurationSeconds: 3,
      };
      const view = toBreathingViewModel(
        runningBeforeBoundary,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.techniqueHint).toBeNull();
      expect(view.hint).toBeNull();
    });

    it("shows the nostril hint on inhale, keyed to cycle parity", () => {
      const running = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 1,
        cycleCount: 1,
        lastFrameTimeMs: 1_000,
        phaseDurationSeconds: 4,
      };
      const view = toBreathingViewModel(
        running,
        BreathingSettings.fromDto({ inhale: 4, hold: 2, exhale: 6, rest: 1 }),
        null,
        null,
        NOSTRIL_PRESET,
      );
      expect(view.techniqueHint).toBe("Right nostril");
      expect(view.hint).toBe("Right nostril");
      expect(view.announcement).toBe("INHALE. 4 seconds. Right nostril.");
    });

    it("joins a ramp hint and a technique hint with a middle dot when both apply", () => {
      const running = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 2,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 30,
        cycleCount: 0,
        lastFrameTimeMs: 30_000,
        phaseDurationSeconds: 7,
      };
      const view = toBreathingViewModel(
        running,
        BreathingSettings.fromDto({ inhale: 4, hold: 2, exhale: 6, rest: 1 }),
        null,
        "wind-down",
        NOSTRIL_PRESET,
      );
      expect(view.rampHint).toBe("Exhale now 7s");
      expect(view.techniqueHint).toBe("Right nostril");
      expect(view.hint).toBe("Exhale now 7s · Right nostril");
      expect(view.announcement).toBe("EXHALE. 7 seconds. Right nostril.");
    });

    it("is null when neither applies", () => {
      const view = toBreathingViewModel(createIdleBreathingState(), settings);
      expect(view.hint).toBeNull();
      expect(view.techniqueHint).toBeNull();
    });
  });

  describe("topOffFraction", () => {
    const SIGH_PRESET = {
      id: "acute-de-stress" as const,
      name: "Acute De-Stress",
      description: "Physiological sigh.",
      durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
      recommendedCycles: 4,
      topOffSeconds: 1,
      alternateNostrils: false,
    };

    it("is boundary / inhaleDuration when activePreset has topOffSeconds and phase is inhale", () => {
      const view = toBreathingViewModel(
        createIdleBreathingState(),
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      // boundary = 3 - 1 = 2; fraction = 2 / 3
      expect(view.topOffFraction).toBeCloseTo(2 / 3, 5);
    });

    it("is null when activePreset has no topOffSeconds", () => {
      const view = toBreathingViewModel(createIdleBreathingState(), settings);
      expect(view.topOffFraction).toBeNull();
    });

    it("is null when the active phase is not inhale", () => {
      const runningExhale = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 2,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 10,
        cycleCount: 0,
        lastFrameTimeMs: 10_000,
        phaseDurationSeconds: 6,
      };
      const view = toBreathingViewModel(
        runningExhale,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.topOffFraction).toBeNull();
    });

    it("tracks the live ramped inhale duration while running, not the base setting (ramp-safety)", () => {
      const rampedInhale = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 1,
        cycleCount: 3,
        lastFrameTimeMs: 1_000,
        phaseDurationSeconds: 5,
      };
      const view = toBreathingViewModel(
        rampedInhale,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        "slow-down",
        SIGH_PRESET,
      );
      // boundary = 5 - 1 = 4; fraction = 4 / 5
      expect(view.topOffFraction).toBeCloseTo(4 / 5, 5);
    });

    it("is null once the session has completed, even though phase is inhale and activePreset is still set", () => {
      const completed = {
        ...startBreathing(createIdleBreathingState()),
        status: "completed" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 0,
        totalElapsedSeconds: 12,
        cycleCount: 4,
        lastFrameTimeMs: null,
        phaseDurationSeconds: 3,
      };
      const view = toBreathingViewModel(
        completed,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.topOffFraction).toBeNull();
    });
  });
});
