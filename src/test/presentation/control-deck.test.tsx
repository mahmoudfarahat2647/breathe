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
import { GoalPicker } from "@/presentation/goal-picker";
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
  const result = render(<ControlDeck {...props} />);
  return { ...props, container: result.container };
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

  it("maintains sequential tab order where Session Goal controls receive focus before the Sound switch in running state", async () => {
    const user = userEvent.setup();
    renderControlDeck({
      view: toBreathingViewModel(
        startBreathing(createIdleBreathingState()),
        settings,
      ),
      goalPicker: <GoalPicker selectedGoal={null} onSelect={vi.fn()} />,
    });

    const pauseButton = screen.getByRole("button", { name: "Pause" });
    const resetButton = screen.getByRole("button", { name: "Reset" });
    const activePreset = screen.getByRole("radio", { name: "Current Calm" });
    const durationsToggle = screen.getByRole("button", { name: "Durations" });
    const goalNone = screen.getByRole("button", { name: "None" });
    const goal2Min = screen.getByRole("button", { name: "2 min" });
    const goal5Min = screen.getByRole("button", { name: "5 min" });
    const goal10Min = screen.getByRole("button", { name: "10 min" });
    const goal5Cycles = screen.getByRole("button", { name: "5 cycles" });
    const goal10Cycles = screen.getByRole("button", { name: "10 cycles" });
    const soundSwitch = screen.getByRole("switch", { name: "Sound" });

    await user.tab();
    expect(document.activeElement).toBe(pauseButton);

    await user.tab();
    expect(document.activeElement).toBe(resetButton);

    await user.tab();
    expect(document.activeElement).toBe(activePreset);

    await user.tab();
    expect(document.activeElement).toBe(durationsToggle);

    await user.tab();
    expect(document.activeElement).toBe(goalNone);

    await user.tab();
    expect(document.activeElement).toBe(goal2Min);

    await user.tab();
    expect(document.activeElement).toBe(goal5Min);

    await user.tab();
    expect(document.activeElement).toBe(goal10Min);

    await user.tab();
    expect(document.activeElement).toBe(goal5Cycles);

    await user.tab();
    expect(document.activeElement).toBe(goal10Cycles);

    await user.tab();
    expect(document.activeElement).toBe(soundSwitch);
  });

  it("confirms the durations disclosure aria-controls resolves to a real element present in the rendered DOM", () => {
    const { container } = renderControlDeck();

    const disclosure = screen.getByRole("button", { name: "Durations" });
    const controlsId = disclosure.getAttribute("aria-controls");
    expect(controlsId).toBe("duration-panel");
    expect(controlsId).toBeTruthy();

    const targetElement = container.querySelector(`#${controlsId}`);
    expect(targetElement).toBeInTheDocument();
    expect(targetElement?.id).toBe("duration-panel");
  });

  it("excludes control deck divider elements from the accessibility tree", () => {
    const { container } = renderControlDeck();

    const dividers = container.querySelectorAll(".control-deck-divider");
    expect(dividers.length).toBeGreaterThan(0);
    dividers.forEach((divider) => {
      expect(divider).toHaveAttribute("role", "separator");
      expect(divider).toHaveAttribute("aria-hidden", "true");
    });

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });
});
