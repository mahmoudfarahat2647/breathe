import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import { BreatheApp } from "@/presentation/breathe-app";
import { toBreathingViewModel } from "@/presentation/view-model";

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

const settings = BreathingSettings.fromDto({
  inhale: 4,
  hold: 2,
  exhale: 6,
  rest: 1,
});

describe("hint line merge component tests", () => {
  it("renders both hints with middle-dot separator when both ramp and technique hints apply", () => {
    const runningRampedExhale = {
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
      runningRampedExhale,
      settings,
      null,
      "wind-down",
      NOSTRIL_PRESET,
    );

    const { container } = render(
      <div className="mv-square-content">
        <span className="mv-count">{view.countdown}</span>
        {view.hint ? (
          <span className="mv-ramp-hint mv-hint">{view.hint}</span>
        ) : null}
      </div>,
    );

    const hint = container.querySelector(".mv-ramp-hint");
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("Exhale now 7s · Right nostril");
    expect(hint?.textContent).toContain(" · ");
  });

  it("renders only ramp hint when no technique cue applies", () => {
    const runningRampedExhale = {
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
      runningRampedExhale,
      settings,
      null,
      "wind-down",
      null,
    );

    const { container } = render(
      <div className="mv-square-content">
        <span className="mv-count">{view.countdown}</span>
        {view.hint ? (
          <span className="mv-ramp-hint mv-hint">{view.hint}</span>
        ) : null}
      </div>,
    );

    const hint = container.querySelector(".mv-ramp-hint");
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("Exhale now 7s");
    expect(hint?.textContent).not.toContain("·");
  });

  it("renders only technique hint when no ramp hint applies", () => {
    const runningInhale = {
      ...startBreathing(createIdleBreathingState()),
      status: "running" as const,
      phaseIndex: 0,
      phaseElapsedSeconds: 1,
      totalElapsedSeconds: 1,
      cycleCount: 0,
      lastFrameTimeMs: 1_000,
      phaseDurationSeconds: 4,
    };
    const view = toBreathingViewModel(
      runningInhale,
      settings,
      null,
      null,
      NOSTRIL_PRESET,
    );

    const { container } = render(
      <div className="mv-square-content">
        <span className="mv-count">{view.countdown}</span>
        {view.hint ? (
          <span className="mv-ramp-hint mv-hint">{view.hint}</span>
        ) : null}
      </div>,
    );

    const hint = container.querySelector(".mv-ramp-hint");
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("Left nostril");
    expect(hint?.textContent).not.toContain("·");
  });

  it("is absent entirely when neither hint applies", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);

    const { container } = render(
      <div className="mv-square-content">
        <span className="mv-count">{view.countdown}</span>
        {view.hint ? (
          <span className="mv-ramp-hint mv-hint">{view.hint}</span>
        ) : null}
      </div>,
    );

    expect(container.querySelector(".mv-ramp-hint")).toBeNull();
    expect(container.querySelector(".mv-hint")).toBeNull();
  });

  it("renders nostril hint text in BreatheApp when Mood Elevation is active and started", async () => {
    const user = userEvent.setup();
    const persistence = {
      initialize: async () => ({
        durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
        goal: null,
        ramp: null,
      }),
      saveSettings: async () => {},
      saveSession: async () => {},
    };
    const { container } = render(<BreatheApp persistence={persistence} />);

    // Select Mood Elevation from Protocol Picker
    await user.click(screen.getByRole("button", { name: /Protocol:|Resonance Coherence/i }));
    await user.click(
      within(screen.getByRole("group", { name: "Protocols" })).getByRole(
        "button",
        { name: /Mood Elevation/ },
      ),
    );

    // Before start: hint is absent
    expect(container.querySelector(".mv-ramp-hint")).toBeNull();

    // Start session
    await user.click(screen.getByRole("button", { name: "Start" }));

    // While running inhale: "Left nostril" is visible
    const hint = container.querySelector(".mv-ramp-hint");
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("Left nostril");

    // Announcement region contains nostril text
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Left nostril");
  });
});
