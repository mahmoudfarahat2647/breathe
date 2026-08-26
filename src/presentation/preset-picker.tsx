"use client";

import { useRef } from "react";

import { BREATHING_PRESET_CATALOG } from "@/domain/breathing-preset";
import type { BreathingPresetId } from "@/domain/breathing-preset";
import { Button } from "@/components/ui/button";

type PresetPickerProps = {
  activePresetId: BreathingPresetId;
  onSelect: (presetId: BreathingPresetId) => void;
  onAnnounce: (message: string) => void;
};

export function PresetPicker({
  activePresetId,
  onSelect,
  onAnnounce,
}: PresetPickerProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectPreset(presetId: BreathingPresetId) {
    if (presetId === activePresetId) return;
    const preset = BREATHING_PRESET_CATALOG.find((item) => item.id === presetId);
    if (!preset) return;
    onSelect(presetId);
    onAnnounce(
      `${preset.name} preset selected. ${preset.description}`,
    );
  }

  const hasChecked = BREATHING_PRESET_CATALOG.some(
    (preset) => preset.id === activePresetId,
  );

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % BREATHING_PRESET_CATALOG.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex =
        (currentIndex - 1 + BREATHING_PRESET_CATALOG.length) %
        BREATHING_PRESET_CATALOG.length;
    }

    if (nextIndex !== null) {
      const nextPreset = BREATHING_PRESET_CATALOG[nextIndex];
      selectPreset(nextPreset.id);
      buttonRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <fieldset className="preset-picker">
      <legend className="preset-legend">Breathing pattern</legend>
      <div className="preset-options" role="radiogroup" aria-label="Breathing pattern">
        {BREATHING_PRESET_CATALOG.map((preset, index) => {
          const checked = activePresetId === preset.id;
          const isTabbable = checked || (!hasChecked && index === 0);
          return (
            <Button
              key={preset.id}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              variant={checked ? "breathePrimary" : "breatheGhost"}
              size="breathe"
              aria-checked={checked}
              tabIndex={isTabbable ? 0 : -1}
              data-preset={preset.id}
              title={preset.description}
              onClick={() => selectPreset(preset.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {preset.name}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
