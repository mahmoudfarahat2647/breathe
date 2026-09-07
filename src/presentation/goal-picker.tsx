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

type ExtraChip = {
  kind: "minutes" | "cycles";
  value: number;
};

function needsExtraChip(selectedGoal: SessionGoal): ExtraChip | null {
  if (selectedGoal === null) return null;
  if (
    selectedGoal.kind === "minutes" &&
    !MINUTE_OPTIONS.includes(
      selectedGoal.minutes as (typeof MINUTE_OPTIONS)[number],
    )
  ) {
    return { kind: "minutes", value: selectedGoal.minutes };
  }
  if (
    selectedGoal.kind === "cycles" &&
    !CYCLE_OPTIONS.includes(
      selectedGoal.cycles as (typeof CYCLE_OPTIONS)[number],
    )
  ) {
    return { kind: "cycles", value: selectedGoal.cycles };
  }
  return null;
}

export function GoalPicker({ selectedGoal, onSelect }: GoalPickerProps) {
  const extraChip = needsExtraChip(selectedGoal);

  return (
    <div className="goal-picker gap-0 py-[clamp(12px,2vh,16px)]">
      <span className="goal-picker-label label-tier">Session goal</span>
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
        {extraChip ? (
          <Button
            key={`extra-${extraChip.kind}-${extraChip.value}`}
            type="button"
            variant="breathePrimary"
            size="breathe"
            aria-pressed={true}
            onClick={() => onSelect(selectedGoal)}
          >
            {extraChip.kind === "cycles"
              ? `${extraChip.value} cycles`
              : `${extraChip.value} min`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
