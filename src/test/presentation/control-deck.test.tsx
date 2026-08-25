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

describe("ControlDeck", () => {
  it("renders transport, stats, bilingual steppers, recommended reset, and sound", () => {
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
    expect(screen.getByText("شهيق")).toBeInTheDocument();
    expect(screen.getByText("حبس")).toBeInTheDocument();
    expect(screen.getByText("زفير")).toBeInTheDocument();
    expect(screen.getAllByText("4s")).toHaveLength(2);
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset to Recommended (4-4-6)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A commonly recommended calming pattern/i),
    ).toBeInTheDocument();
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

    await user.click(
      screen.getByRole("button", { name: "Reset to Recommended (4-4-6)" }),
    );
    expect(onRecommended).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("switch", { name: "Sound" }));
    expect(onSoundChange).toHaveBeenCalledWith(true);
  });
});
