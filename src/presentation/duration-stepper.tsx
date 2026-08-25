"use client";

import { PHASES, type Phase } from "@/domain/phase";
import { Button } from "@/components/ui/button";
import type { BreathingViewModel } from "./view-model";

type DurationStepperProps = {
  view: BreathingViewModel;
  onAdjust: (phase: Phase, direction: number) => void;
  onRecommended: () => void;
};

const PHASE_ROW_AR: Record<Phase, string> = {
  inhale: "شهيق",
  hold: "حبس",
  exhale: "زفير",
};

const PHASE_ROW_EN: Record<Phase, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
};

export function DurationStepper({
  view,
  onAdjust,
  onRecommended,
}: DurationStepperProps) {
  return (
    <div className="panel durations" aria-label="Phase durations">
      {PHASES.map((phase) => (
        <div className="duration-row" key={phase}>
          <span className="duration-label">
            {PHASE_ROW_EN[phase]}{" "}
            <span className="ar" lang="ar" dir="rtl">
              {PHASE_ROW_AR[phase]}
            </span>
          </span>
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

      <div className="default-row">
        <Button
          type="button"
          variant="breatheGhost"
          size="breathe"
          onClick={onRecommended}
        >
          Reset to Recommended (4-4-6)
        </Button>
      </div>
      <p className="default-hint">
        A commonly recommended calming pattern — inhale 4s, hold 4s, exhale 6s.
        The longer exhale helps activate the body&apos;s relaxation response. Not
        medical advice.
      </p>
    </div>
  );
}
