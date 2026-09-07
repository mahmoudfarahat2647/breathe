"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  BREATHING_PRESET_CATALOG,
  type BreathingPreset,
  type BreathingPresetId,
} from "@/domain/breathing-preset";

const PRESET_PANEL_ID = "preset-panel";

type PresetPickerProps = {
  activePresetId: BreathingPresetId;
  onSelect: (id: BreathingPresetId) => void;
};

function dosageText(preset: BreathingPreset): string {
  const total =
    preset.durations.inhale +
    preset.durations.hold +
    preset.durations.exhale +
    preset.durations.rest;
  const mins = Math.max(1, Math.round((preset.recommendedCycles * total) / 60));
  return `${preset.recommendedCycles} cycles · ~${mins} min`;
}

export function PresetPicker({ activePresetId, onSelect }: PresetPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId().replace(/:/g, "");
  const panelDomId = `${PRESET_PANEL_ID}-${panelId}`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const triggerLabel =
    BREATHING_PRESET_CATALOG.find((p) => p.id === activePresetId)?.name ??
    "Custom";

  function handlePick(id: BreathingPresetId) {
    onSelect(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="preset-panel">
      <button
        ref={triggerRef}
        type="button"
        className="preset-toggle label-tier"
        aria-expanded={open}
        aria-controls={panelDomId}
        onClick={() => setOpen((o) => !o)}
      >
        {triggerLabel}
      </button>
      <div
        id={panelDomId}
        ref={panelRef}
        className="preset-fields"
        hidden={!open}
        data-expanded={open ? "true" : undefined}
      >
        <div className="preset-cards" role="group" aria-label="Protocols">
          {BREATHING_PRESET_CATALOG.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-card"
              aria-pressed={preset.id === activePresetId}
              onClick={() => handlePick(preset.id)}
            >
              <span className="preset-card-name">{preset.name}</span>
              <span className="preset-card-rationale">
                {preset.description}
              </span>
              <span className="preset-card-dosage">{dosageText(preset)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
