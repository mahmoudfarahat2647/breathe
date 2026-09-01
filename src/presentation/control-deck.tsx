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
      <Card className="panel panel-elevated control-deck-unified gap-0 ring-0">
        <div className="control-deck-row control-deck-row-primary">
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
        </div>

        <div className="control-deck-divider" role="separator" aria-hidden="true" />

        <div className="control-deck-row">
          <PresetPicker
            activePresetId={activePresetId}
            onSelect={onSelectPreset}
            onAnnounce={onAnnounce}
          />
        </div>

        <div className="control-deck-divider" role="separator" aria-hidden="true" />

        <div className="control-deck-row">
          <DurationStepper
            view={view}
            activePresetId={activePresetId}
            onAdjust={onAdjust}
          />
        </div>

        <div className="control-deck-divider" role="separator" aria-hidden="true" />

        <div className="control-deck-row">{goalPicker}</div>

        <div className="control-deck-divider" role="separator" aria-hidden="true" />

        <div className="control-deck-row control-deck-row-sound">
          <label className="switch-field">
            <Switch
              className="breathe-switch"
              checked={soundEnabled}
              onCheckedChange={(checked) => onSoundChange(checked)}
            />
            Sound
          </label>
        </div>

        <div className="control-deck-divider" role="separator" aria-hidden="true" />

        <div className="control-deck-row">{history}</div>
      </Card>
    </section>
  );
}
