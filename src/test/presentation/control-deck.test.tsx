import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  BreathingSettings,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import { ControlDeck } from "@/presentation/control-deck";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.default();

function renderControlDeck(
  overrides: Partial<ComponentProps<typeof ControlDeck>> = {},
) {
  const view = overrides.view ?? toBreathingViewModel(createIdleBreathingState(), settings);
  const props = {
    view,
    activePresetId: "current-calm" as const,
    soundEnabled: false,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onAdjust: vi.fn(),
    onSelectPreset: vi.fn(),
    onAnnounce: vi.fn(),
    onSoundChange: vi.fn(),
    ...overrides,
  };
  render(<ControlDeck {...props} />);
  return props;
}

describe("ControlDeck", () => {
  it("renders transport, stats, sound, and an always-visible preset picker; durations panel starts collapsed", () => {
    renderControlDeck();

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByText("Cycle")).toBeInTheDocument();
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("Sound")).toBeInTheDocument();

    expect(screen.getByRole("radiogroup", { name: "Breathing preset" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Current Calm" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Box" })).toBeInTheDocument();

    const disclosure = screen.getByRole("button", { name: "Durations" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveAttribute("aria-controls", "duration-panel");
    expect(screen.getByLabelText("Decrease inhale duration")).not.toBeVisible();
  });

  it("expands the durations panel on toggle, revealing the phase steppers", async () => {
    const user = userEvent.setup();
    renderControlDeck();

    const disclosure = screen.getByRole("button", { name: "Durations" });
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByLabelText("Decrease inhale duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase hold duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease exhale duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase rest duration")).toBeInTheDocument();
    expect(screen.getByText("Inhale")).toBeInTheDocument();
    expect(screen.getByText("Hold")).toBeInTheDocument();
    expect(screen.getByText("Exhale")).toBeInTheDocument();
    expect(screen.getByText("Rest")).toBeInTheDocument();
  });

  it("shows Pause while running and wires control callbacks", async () => {
    const user = userEvent.setup();
    const props = renderControlDeck({
      view: toBreathingViewModel(
        startBreathing(createIdleBreathingState()),
        settings,
      ),
      startRef: { current: null },
      pauseRef: { current: null },
    });

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(props.onPause).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(props.onReset).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Durations" }));
    await user.click(screen.getByLabelText("Increase inhale duration"));
    expect(props.onAdjust).toHaveBeenCalledWith("inhale", 1);

    await user.click(screen.getByRole("radio", { name: "Box" }));
    expect(props.onSelectPreset).toHaveBeenCalledWith("box");

    await user.click(screen.getByRole("switch", { name: "Sound" }));
    expect(props.onSoundChange).toHaveBeenCalledWith(true);
  });
});
