import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BreatheApp } from "@/presentation/breathe-app";

describe("BreatheApp", () => {
  it("renders the wordmark, announcer, decorative SVG, and controls without preset radios", () => {
    render(<BreatheApp />);

    expect(screen.getByText("Breathe")).toBeInTheDocument();
    expect(screen.queryByText("تنفّس")).not.toBeInTheDocument();

    const svgs = screen.getAllByRole("img", { hidden: true });
    expect(svgs.length).toBeGreaterThan(0);
    expect(svgs[0]).toHaveAttribute("aria-hidden", "true");

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");

    const controls = screen.getByRole("region", {
      name: "Breathing exercise controls",
    });
    expect(controls).toBeInTheDocument();
    expect(controls).toContainElement(
      screen.getByRole("group", { name: "Session goal" }),
    );

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("handles advanced options disclosure and reveals phase steppers", async () => {
    const user = userEvent.setup();
    const { container } = render(<BreatheApp />);

    const disclosure = screen.getByRole("button", {
      name: "Show advanced options",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Decrease inhale duration")).not.toBeVisible();

    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Decrease inhale duration")).toBeVisible();
    expect(screen.getByLabelText("Increase inhale duration")).toBeVisible();
    expect(screen.getByLabelText("Decrease hold duration")).toBeVisible();
    expect(screen.getByLabelText("Increase hold duration")).toBeVisible();
    expect(screen.getByLabelText("Decrease exhale duration")).toBeVisible();
    expect(screen.getByLabelText("Increase exhale duration")).toBeVisible();
    expect(screen.getByLabelText("Decrease rest duration")).toBeVisible();
    expect(screen.getByLabelText("Increase rest duration")).toBeVisible();

    expect(container.querySelector("#inhaleValue")).toHaveTextContent("4s");
    await user.click(screen.getByLabelText("Increase inhale duration"));
    expect(container.querySelector("#inhaleValue")).toHaveTextContent("5s");
  });

  it("links advanced options aria-controls to the rendered duration panel", () => {
    const { container } = render(<BreatheApp />);
    const btn = screen.getByRole("button", {
      name: "Show advanced options",
    });
    const target = container.querySelector("#" + btn.getAttribute("aria-controls"));
    expect(target).not.toBeNull();
    expect(target?.id).toBe("duration-panel");
  });

  it("renders exactly one History button which opens and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    const historyButtons = screen.getAllByRole("button", { name: "History" });
    expect(historyButtons).toHaveLength(1);
    const historyButton = historyButtons[0];
    expect(historyButton).toHaveAttribute("aria-expanded", "false");

    await user.click(historyButton);
    expect(historyButton).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(historyButton).toHaveAttribute("aria-expanded", "false");
    expect(historyButton).toHaveFocus();
  });

  it("controls Reset visibility and moves focus between Start/Resume and Pause", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

    const startButton = screen.getByRole("button", { name: "Start" });
    await user.click(startButton);

    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    const pauseButton = screen.getByRole("button", { name: "Pause" });
    expect(pauseButton).toHaveFocus();

    await user.click(pauseButton);
    const resumeButton = screen.getByRole("button", { name: "Resume" });
    expect(resumeButton).toHaveFocus();
  });

  it("handles Sound switch and updates visible On/Off label", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    const soundSwitch = screen.getByRole("switch", { name: "Sound" });
    expect(soundSwitch).toHaveAttribute("aria-checked", "false");
    const soundToggle = soundSwitch.closest(".mv-sound-toggle") as HTMLElement;
    expect(within(soundToggle).getByText("Off")).toBeInTheDocument();

    await user.click(soundSwitch);
    expect(soundSwitch).toHaveAttribute("aria-checked", "true");
    expect(within(soundToggle).getByText("On")).toBeInTheDocument();
  });

  it("updates live announcer when session starts with INHALE and duration", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    await user.click(screen.getByRole("button", { name: "Start" }));
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/INHALE/);
    expect(status.textContent).toMatch(/4/);
  });

  it("toggles transport with Space and resets with R when focus is not on a control", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    await user.keyboard("r");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("asserts full tab order without positive tabindex", async () => {
    const user = userEvent.setup();
    const { container } = render(<BreatheApp />);

    const positiveTabindex = container.querySelectorAll("[tabindex]:not([tabindex='-1']):not([tabindex='0'])");
    expect(positiveTabindex).toHaveLength(0);

    // Open advanced options first so steppers participate in tab order
    const advToggle = screen.getByRole("button", { name: "Show advanced options" });
    await user.click(advToggle);

    // Start session so Reset button is present
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();

    // 1. Skip link
    const skipLink = screen.getByRole("link", { name: "Skip to controls" });
    skipLink.focus();
    expect(skipLink).toHaveFocus();

    // 2. History disclosure button in header
    await user.tab();
    expect(screen.getByRole("button", { name: "History" })).toHaveFocus();

    // 3. Pause button (or Start/Resume)
    await user.tab();
    expect(screen.getByRole("button", { name: "Pause" })).toHaveFocus();

    // 4. Reset button (present while running)
    await user.tab();
    expect(screen.getByRole("button", { name: "Reset" })).toHaveFocus();

    // 5. Sound switch
    await user.tab();
    expect(screen.getByRole("switch", { name: "Sound" })).toHaveFocus();

    // 6-11. Six GoalPicker buttons in DOM order
    await user.tab();
    expect(screen.getByRole("button", { name: "None" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "2 min" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "5 min" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "10 min" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "5 cycles" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "10 cycles" })).toHaveFocus();

    // 12. Show advanced options toggle
    await user.tab();
    expect(advToggle).toHaveFocus();

    // 13-20. Eight Phase stepper buttons (when open)
    const stepperLabels = [
      "Decrease inhale duration",
      "Increase inhale duration",
      "Decrease hold duration",
      "Increase hold duration",
      "Decrease exhale duration",
      "Increase exhale duration",
      "Decrease rest duration",
      "Increase rest duration",
    ];

    for (const label of stepperLabels) {
      await user.tab();
      expect(screen.getByRole("button", { name: label })).toHaveFocus();
    }
  }, 20_000);
});
