"use client";

import { useEffect, useRef, useState } from "react";

import { PHASES, type Phase } from "@/domain/phase";
import { Button } from "@/components/ui/button";
import type { BreathingViewModel } from "./view-model";

type DurationStepperProps = {
  view: BreathingViewModel;
  onAdjust: (phase: Phase, direction: number) => void;
  onRecommended: () => void;
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
  onAdjust,
  onRecommended,
}: DurationStepperProps) {
  const [open, setOpen] = useState(true);
  const userToggledRef = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-height: 640px)");
    const apply = () => {
      if (userToggledRef.current) return;
      setOpen(!media.matches);
    };
    media.addEventListener("change", apply);
    const frame = window.requestAnimationFrame(apply);
    return () => {
      media.removeEventListener("change", apply);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function toggle() {
    userToggledRef.current = true;
    setOpen((current) => !current);
  }

  return (
    <div className="panel durations">
      <button
        type="button"
        className="durations-toggle"
        aria-expanded={open}
        aria-controls={DURATION_PANEL_ID}
        onClick={toggle}
      >
        Durations
      </button>
      <div id={DURATION_PANEL_ID} className="duration-fields" hidden={!open}>
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

        <div className="default-row">
          <Button
            type="button"
            variant="breatheGhost"
            size="breathe"
            onClick={onRecommended}
          >
            Use 4-4-6-2
          </Button>
        </div>
        <p className="default-hint">
          A common calming pattern: inhale 4s, hold 4s, exhale 6s, rest 2s. The
          longer exhale supports the relaxation response. Not medical advice.
        </p>
      </div>
    </div>
  );
}
