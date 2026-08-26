import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PresetPicker } from "@/presentation/preset-picker";
import type { BreathingPresetId } from "@/domain/breathing-preset";

describe("PresetPicker", () => {
  it("renders catalog presets as a keyboard-accessible radio group", () => {
    render(
      <PresetPicker
        activePresetId="current-calm"
        onSelect={vi.fn()}
        onAnnounce={vi.fn()}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Breathing pattern" });
    expect(group).toBeInTheDocument();
    const currentCalm = screen.getByRole("radio", { name: "Current Calm" });
    const triangle = screen.getByRole("radio", { name: "Triangle" });
    expect(currentCalm).toHaveAttribute("aria-checked", "true");
    expect(currentCalm).toHaveAttribute("tabindex", "0");
    expect(triangle).toHaveAttribute("aria-checked", "false");
    expect(triangle).toHaveAttribute("tabindex", "-1");
  });

  it("selects a preset and announces the change", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onAnnounce = vi.fn();
    render(
      <PresetPicker
        activePresetId="current-calm"
        onSelect={onSelect}
        onAnnounce={onAnnounce}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Box" }));
    expect(onSelect).toHaveBeenCalledWith("box");
    expect(onAnnounce).toHaveBeenCalledWith(
      expect.stringContaining("Box preset selected"),
    );
  });

  it("navigates and selects presets using arrow keys with roving focus", async () => {
    const user = userEvent.setup();
    function InteractivePicker() {
      const [active, setActive] = useState<BreathingPresetId>("current-calm");
      return (
        <PresetPicker
          activePresetId={active}
          onSelect={setActive}
          onAnnounce={vi.fn()}
        />
      );
    }
    render(<InteractivePicker />);

    const currentCalm = screen.getByRole("radio", { name: "Current Calm" });
    currentCalm.focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Triangle" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Triangle" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Box" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Box" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Triangle" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Triangle" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Current Calm" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Current Calm" })).toHaveFocus();

    // Wrap around to the end of the catalog
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Coherence" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Coherence" })).toHaveFocus();
  });
});
