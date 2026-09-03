"use client";

import { RAMP_CATALOG, type Ramp } from "@/domain/ramp";
import { Button } from "@/components/ui/button";

type RampPickerProps = {
  selectedRamp: Ramp;
  onSelect: (ramp: Ramp) => void;
};

const OFF_DESCRIPTION = "No ramp — durations stay as you set them.";

export function RampPicker({ selectedRamp, onSelect }: RampPickerProps) {
  const windDown = RAMP_CATALOG["wind-down"];
  const description = selectedRamp
    ? RAMP_CATALOG[selectedRamp].description
    : OFF_DESCRIPTION;

  return (
    <div className="ramp-picker">
      <span className="ramp-picker-label label-tier">Ramp</span>
      <div className="ramp-options" role="group" aria-label="Ramp">
        <Button
          type="button"
          variant={selectedRamp === null ? "breathePrimary" : "breatheSecondary"}
          size="breathe"
          aria-pressed={selectedRamp === null}
          onClick={() => onSelect(null)}
        >
          Off
        </Button>
        <Button
          type="button"
          variant={
            selectedRamp === "wind-down" ? "breathePrimary" : "breatheSecondary"
          }
          size="breathe"
          aria-pressed={selectedRamp === "wind-down"}
          onClick={() => onSelect("wind-down")}
        >
          {windDown.name}
        </Button>
      </div>
      <p className="default-hint">{description}</p>
    </div>
  );
}
