import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GoalPicker } from "@/presentation/goal-picker";

describe("GoalPicker", () => {
  it("renders only fixed chips and None when selectedGoal is null", () => {
    render(<GoalPicker selectedGoal={null} onSelect={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    // None, 2 min, 5 min, 10 min, 5 cycles, 10 cycles = 6 buttons
    expect(buttons).toHaveLength(6);
    expect(screen.getByRole("button", { name: "None" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders an extra pressed chip when selectedGoal is non-standard", () => {
    render(
      <GoalPicker
        selectedGoal={{ kind: "cycles", cycles: 12 }}
        onSelect={vi.fn()}
      />,
    );

    const chips = screen.getAllByRole("button", { name: "12 cycles" });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("does not render a duplicate extra chip when selectedGoal coincides with a fixed chip", () => {
    render(
      <GoalPicker
        selectedGoal={{ kind: "cycles", cycles: 10 }}
        onSelect={vi.fn()}
      />,
    );

    const chips = screen.getAllByRole("button", { name: "10 cycles" });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect when clicking the extra chip", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const goal = { kind: "cycles" as const, cycles: 25 };

    render(<GoalPicker selectedGoal={goal} onSelect={onSelect} />);

    const extraChip = screen.getByRole("button", { name: "25 cycles" });
    expect(extraChip).toHaveAttribute("aria-pressed", "true");

    await user.click(extraChip);
    expect(onSelect).toHaveBeenCalledWith(goal);
  });
});
