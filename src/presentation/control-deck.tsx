"use client";

import type { Ref } from "react";

import type { Phase } from "@/domain/phase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DurationStepper } from "./duration-stepper";
import type { BreathingViewModel } from "./view-model";

type ControlDeckProps = {
  view: BreathingViewModel;
  soundEnabled: boolean;
  startRef?: Ref<HTMLButtonElement>;
  pauseRef?: Ref<HTMLButtonElement>;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onAdjust: (phase: Phase, direction: number) => void;
  onRecommended: () => void;
  onSoundChange: (enabled: boolean) => void;
};

export function ControlDeck({
  view,
  soundEnabled,
  startRef,
  pauseRef,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onRecommended,
  onSoundChange,
}: ControlDeckProps) {
  return (
    <section className="control-deck" aria-label="Breathing exercise controls">
      <Card className="panel gap-0 py-[clamp(12px,2vh,16px)] ring-0">
        <div className="transport-row">
          {view.showPause ? (
            <Button
              ref={pauseRef}
              type="button"
              variant="breathePrimary"
              size="breathe"
              onClick={onPause}
            >
              Pause
            </Button>
          ) : (
            <Button
              ref={startRef}
              type="button"
              variant="breathePrimary"
              size="breathe"
              onClick={onStart}
            >
              {view.primaryLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="breatheSecondary"
            size="breathe"
            onClick={onReset}
          >
            Reset
          </Button>
        </div>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-label">Cycle</span>
            <span className="stat-value">{view.cycleCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Elapsed</span>
            <span className="stat-value">{view.elapsed}</span>
          </div>
        </div>
      </Card>

      <DurationStepper
        view={view}
        onAdjust={onAdjust}
        onRecommended={onRecommended}
      />

      <Card className="panel aux-row gap-0 py-[clamp(12px,2vh,16px)] ring-0">
        <label className="switch-field">
          <Switch
            className="breathe-switch"
            checked={soundEnabled}
            onCheckedChange={(checked) => onSoundChange(checked)}
          />
          Sound
        </label>
      </Card>
    </section>
  );
}
