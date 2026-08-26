import { render, screen, waitFor } from "@testing-library/react";
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

describe("ControlDeck", () => {
  it("renders transport, stats, English steppers, recommended reset, and sound", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    render(
      <ControlDeck
        view={view}
        soundEnabled={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onReset={vi.fn()}
        onAdjust={vi.fn()}
        onRecommended={vi.fn()}
        onSoundChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByText("Cycle")).toBeInTheDocument();
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease inhale duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase hold duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease exhale duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase rest duration")).toBeInTheDocument();
    expect(screen.getByText("Inhale")).toBeInTheDocument();
    expect(screen.getByText("Hold")).toBeInTheDocument();
    expect(screen.getByText("Exhale")).toBeInTheDocument();
    expect(screen.getByText("Rest")).toBeInTheDocument();
    expect(screen.queryByText("شهيق")).not.toBeInTheDocument();
    expect(screen.queryByText("حبس")).not.toBeInTheDocument();
    expect(screen.queryByText("زفير")).not.toBeInTheDocument();
    expect(screen.getAllByText("4s")).toHaveLength(2);
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(screen.getByText("2s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use 4-4-6-2" })).toBeInTheDocument();
    expect(screen.getByText(/A common calming pattern/i)).toBeInTheDocument();
    const disclosure = screen.getByRole("button", { name: "Durations" });
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(disclosure).toHaveAttribute("aria-controls", "duration-panel");
    expect(screen.getByText("Sound")).toBeInTheDocument();
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/badge/i)).not.toBeInTheDocument();
  });

  it("shows Pause while running and wires control callbacks", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onPause = vi.fn();
    const onReset = vi.fn();
    const onAdjust = vi.fn();
    const onRecommended = vi.fn();
    const onSoundChange = vi.fn();
    const view = toBreathingViewModel(
      startBreathing(createIdleBreathingState()),
      settings,
    );

    render(
      <ControlDeck
        view={view}
        soundEnabled={false}
        startRef={{ current: null }}
        pauseRef={{ current: null }}
        onStart={onStart}
        onPause={onPause}
        onReset={onReset}
        onAdjust={onAdjust}
        onRecommended={onRecommended}
        onSoundChange={onSoundChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPause).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledOnce();

    await user.click(screen.getByLabelText("Increase inhale duration"));
    expect(onAdjust).toHaveBeenCalledWith("inhale", 1);

    await user.click(screen.getByRole("button", { name: "Use 4-4-6-2" }));
    expect(onRecommended).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("switch", { name: "Sound" }));
    expect(onSoundChange).toHaveBeenCalledWith(true);
  });

  it("collapses durations on short viewports until the user toggles", async () => {
    const user = userEvent.setup();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-height: 640px"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    render(
      <ControlDeck
        view={view}
        soundEnabled={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onReset={vi.fn()}
        onAdjust={vi.fn()}
        onRecommended={vi.fn()}
        onSoundChange={vi.fn()}
      />,
    );

    const disclosure = screen.getByRole("button", { name: "Durations" });
    await waitFor(() => {
      expect(disclosure).toHaveAttribute("aria-expanded", "false");
    });
    expect(
      screen.queryByRole("button", { name: "Decrease inhale duration" }),
    ).not.toBeInTheDocument();

    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Decrease rest duration")).toBeInTheDocument();
  });
});
