"use client";

import type { SessionGoal } from "@/domain/session-goal";
import { Button } from "@/components/ui/button";

const MINUTE_OPTIONS = [2, 5, 10] as const;
const CYCLE_OPTIONS = [5, 10] as const;

type GoalPickerProps = {
  selectedGoal: SessionGoal;
  onSelect: (goal: SessionGoal) => void;
};

function isSelected(
  selectedGoal: SessionGoal,
  kind: "minutes" | "cycles",
  value: number,
): boolean {
  if (selectedGoal === null) return false;
  if (selectedGoal.kind === "minutes") {
    return kind === "minutes" && selectedGoal.minutes === value;
  }
  if (selectedGoal.kind === "cycles") {
    return kind === "cycles" && selectedGoal.cycles === value;
  }
  return false;
}

export function GoalPicker({ selectedGoal, onSelect }: GoalPickerProps) {
  return (
    <div className="panel goal-picker gap-0 py-[clamp(12px,2vh,16px)] ring-0">
      <span className="goal-picker-label">Session goal</span>
      <div className="goal-options" role="group" aria-label="Session goal">
        <Button
          type="button"
          variant={selectedGoal === null ? "breathePrimary" : "breatheSecondary"}
          size="breathe"
          aria-pressed={selectedGoal === null}
          onClick={() => onSelect(null)}
        >
          None
        </Button>
        {MINUTE_OPTIONS.map((minutes) => (
          <Button
            key={`minutes-${minutes}`}
            type="button"
            variant={
              isSelected(selectedGoal, "minutes", minutes)
                ? "breathePrimary"
                : "breatheSecondary"
            }
            size="breathe"
            aria-pressed={isSelected(selectedGoal, "minutes", minutes)}
            onClick={() => onSelect({ kind: "minutes", minutes })}
          >
            {minutes} min
          </Button>
        ))}
        {CYCLE_OPTIONS.map((cycles) => (
          <Button
            key={`cycles-${cycles}`}
            type="button"
            variant={
              isSelected(selectedGoal, "cycles", cycles)
                ? "breathePrimary"
                : "breatheSecondary"
            }
            size="breathe"
            aria-pressed={isSelected(selectedGoal, "cycles", cycles)}
            onClick={() => onSelect({ kind: "cycles", cycles })}
          >
            {cycles} cycles
          </Button>
        ))}
      </div>
    </div>
  );
}
