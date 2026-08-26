"use client";

import { useEffect, useRef, useState } from "react";

import { PHASES, type Phase } from "@/domain/phase";
import type { BreathingPresetId } from "@/domain/breathing-preset";
import { Button } from "@/components/ui/button";
import type { BreathingViewModel } from "./view-model";
import { PresetPicker } from "./preset-picker";

type DurationStepperProps = {
  view: BreathingViewModel;
  activePresetId: BreathingPresetId;
  onAdjust: (phase: Phase, direction: number) => void;
  onSelectPreset: (presetId: BreathingPresetId) => void;
  onAnnounce: (message: string) => void;
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
  onSelectPreset,
  onAnnounce,
}: DurationStepperProps) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const userToggledRef = useRef(false);

  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-height: 640px)")
        : null;
    const apply = () => {
      if (userToggledRef.current) return;
      setOpen(media ? !media.matches : true);
    };
    media?.addEventListener("change", apply);
    const frame = window.requestAnimationFrame(() => {
      apply();
      setReady(true);
    });
    return () => {
      media?.removeEventListener("change", apply);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function toggle() {
    userToggledRef.current = true;
    setOpen((current) => !current);
  }

  return (
    <div className="panel durations" data-ready={ready ? "true" : undefined}>
      <button
        type="button"
        className="durations-toggle"
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
        data-expanded={open ? "true" : undefined}
      >
        <PresetPicker
          activePresetId={activePresetId}
          onSelect={onSelectPreset}
          onAnnounce={onAnnounce}
        />

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
            Custom pattern — adjust each phase or pick a preset above. Not medical
            advice.
          </p>
        ) : null}
      </div>
    </div>
  );
}
