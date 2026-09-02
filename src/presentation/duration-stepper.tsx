"use client";

import { useState } from "react";

import { PHASES, type Phase } from "@/domain/phase";
import type { BreathingPresetId } from "@/domain/breathing-preset";
import { Button } from "@/components/ui/button";
import type { BreathingViewModel } from "./view-model";

type DurationStepperProps = {
  view: BreathingViewModel;
  activePresetId: BreathingPresetId;
  onAdjust: (phase: Phase, direction: number) => void;
};

const PHASE_ROW_EN: Record<Phase, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
  rest: "Rest",
};

const DURATION_PANEL_ID = "duration-panel";

export function DurationStepper({
  view,
  activePresetId,
  onAdjust,
}: DurationStepperProps) {
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((current) => !current);
  }

  return (
    <div className="durations">
      <button
        type="button"
        className="durations-toggle label-tier"
        aria-expanded={open}
        aria-controls={DURATION_PANEL_ID}
        onClick={toggle}
      >
        Durations
      </button>
      <div
        id={DURATION_PANEL_ID}
        className="duration-fields"
        hidden={!open}
      >
        {PHASES.map((phase) => (
          <div className="duration-row" key={phase}>
            <span className="duration-label">{PHASE_ROW_EN[phase]}</span>
            <div className="stepper">
              <Button
                type="button"
                variant="breatheStep"
                size="breathe"
                data-phase={phase}
                data-dir="-1"
                aria-label={`Decrease ${phase} duration`}
                onClick={() => onAdjust(phase, -1)}
              >
                −
              </Button>
              <span className="step-value" id={`${phase}Value`}>
                {view.stepperValues[phase]}
              </span>
              <Button
                type="button"
                variant="breatheStep"
                size="breathe"
                data-phase={phase}
                data-dir="1"
                aria-label={`Increase ${phase} duration`}
                onClick={() => onAdjust(phase, 1)}
              >
                +
              </Button>
            </div>
          </div>
        ))}

        {activePresetId === "custom" ? (
          <p className="default-hint">
            Custom preset — adjust each phase or pick a preset above. Not medical
            advice.
          </p>
        ) : null}
      </div>
    </div>
  );
}
