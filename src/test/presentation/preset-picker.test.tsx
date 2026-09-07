import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PresetPicker } from "@/presentation/preset-picker";

describe("PresetPicker", () => {
  it("renders the active preset name or Custom on trigger", () => {
    const { rerender } = render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Resonance Coherence" }),
    ).toBeInTheDocument();

    rerender(<PresetPicker activePresetId="custom" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("opens panel on trigger click and updates aria-expanded", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Resonance Coherence" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    const panelDomId = trigger.getAttribute("aria-controls")!;
    const panel = document.getElementById(panelDomId)!;
    expect(panel).toHaveAttribute("hidden");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
  });

  it("lists exactly 5 cards in the Protocols group", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Resonance Coherence" }),
    );

    const group = screen.getByRole("group", { name: "Protocols" });
    const cards = within(group).getAllByRole("button");
    expect(cards).toHaveLength(5);
  });

  it("marks active preset card as pressed, and no card pressed when custom", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Resonance Coherence" }),
    );

    const group = screen.getByRole("group", { name: "Protocols" });
    const rcCard = within(group).getByRole("button", {
      name: /Resonance Coherence/,
    });
    expect(rcCard).toHaveAttribute("aria-pressed", "true");

    const efCard = within(group).getByRole("button", {
      name: /Executive Focus/,
    });
    expect(efCard).toHaveAttribute("aria-pressed", "false");

    rerender(<PresetPicker activePresetId="custom" onSelect={vi.fn()} />);

    const allCards = within(group).getAllByRole("button");
    for (const card of allCards) {
      expect(card).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("shows dosage text on each card including Executive Focus", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Resonance Coherence" }),
    );

    // Acute De-Stress and Sleep Shift both compute to "4 cycles · ~1 min".
    expect(screen.getAllByText("4 cycles · ~1 min")).toHaveLength(2);
    expect(screen.getByText("10 cycles · ~2 min")).toBeInTheDocument();
    expect(screen.getByText("25 cycles · ~5 min")).toBeInTheDocument();
    expect(screen.getByText("12 cycles · ~3 min")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Resonance Coherence" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes when clicking outside the panel", async () => {
    const user = userEvent.setup();
    render(
      <PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Resonance Coherence" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking a card calls onSelect, closes the panel, and returns focus to trigger", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PresetPicker
        activePresetId="resonance-coherence"
        onSelect={onSelect}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Resonance Coherence" });
    await user.click(trigger);

    const group = screen.getByRole("group", { name: "Protocols" });
    const efCard = within(group).getByRole("button", {
      name: /Executive Focus/,
    });

    await user.click(efCard);

    expect(onSelect).toHaveBeenCalledWith("executive-focus");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
