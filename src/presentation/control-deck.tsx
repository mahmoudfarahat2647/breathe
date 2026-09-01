"use client";

import type { ReactNode, Ref } from "react";

import type { BreathingPresetId } from "@/domain/breathing-preset";
import type { Phase } from "@/domain/phase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DurationStepper } from "./duration-stepper";
import { PresetPicker } from "./preset-picker";
import type { BreathingViewModel } from "./view-model";

type ControlDeckProps = {
  view: BreathingViewModel;
  activePresetId: BreathingPresetId;
  soundEnabled: boolean;
  startRef?: Ref<HTMLButtonElement>;
  pauseRef?: Ref<HTMLButtonElement>;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onAdjust: (phase: Phase, direction: number) => void;
  onSelectPreset: (presetId: BreathingPresetId) => void;
  onAnnounce: (message: string) => void;
  onSoundChange: (enabled: boolean) => void;
  history?: ReactNode;
  goalPicker?: ReactNode;
};

export function ControlDeck({
  view,
  activePresetId,
  soundEnabled,
  startRef,
  pauseRef,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSelectPreset,
  onAnnounce,
  onSoundChange,
  history,
  goalPicker,
}: ControlDeckProps) {
  return (
    <section
      id="controls"
      className="control-deck"
      aria-label="Breathing exercise controls"
    >
      <Card className="panel panel-elevated gap-0 py-[clamp(12px,2vh,16px)] ring-0">
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
            <span className="stat-label label-tier">Cycle</span>
            <span className="stat-value">{view.cycleCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label label-tier">Elapsed</span>
            <span className="stat-value">{view.elapsed}</span>
          </div>
          {view.goalRemaining !== null ? (
            <div className="stat">
              <span className="stat-label label-tier">Remaining</span>
              <span className="stat-value">{view.goalRemaining}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <PresetPicker
        activePresetId={activePresetId}
        onSelect={onSelectPreset}
        onAnnounce={onAnnounce}
      />

      <DurationStepper
        view={view}
        activePresetId={activePresetId}
        onAdjust={onAdjust}
      />

      <Card className="panel panel-quiet aux-row gap-0 py-[clamp(12px,2vh,16px)] ring-0">
        <label className="switch-field">
          <Switch
            className="breathe-switch"
            checked={soundEnabled}
            onCheckedChange={(checked) => onSoundChange(checked)}
          />
          Sound
        </label>
      </Card>

      {goalPicker}

      {history}
    </section>
  );
}
