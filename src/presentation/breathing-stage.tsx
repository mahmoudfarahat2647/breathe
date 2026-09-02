"use client";

import { PHASES } from "@/domain/phase";
import { cn } from "@/lib/utils";
import {
  DOT_RADIUS,
  pointOnRoundedSegment,
  roundedPerimeterSegments,
  SQUARE_VIEWBOX,
} from "./geometry";
import type { BreathingViewModel } from "./view-model";

const INSET = -0.5;
const RADIUS = 32;

const SEGMENTS = roundedPerimeterSegments(INSET, RADIUS);
const BORDER_PATH = `${SEGMENTS.inhale} ${SEGMENTS.hold} ${SEGMENTS.exhale} ${SEGMENTS.rest}`;

export function BreathingStage({ view }: { view: BreathingViewModel }) {
  const rawProgress = 1 - Number(view.sides[view.phase].dashoffset);
  const progress = Math.min(
    1,
    Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0),
  );

  const { x, y } = view.svgIdle
    ? pointOnRoundedSegment("inhale", 0, INSET, RADIUS)
    : pointOnRoundedSegment(view.phase, progress, INSET, RADIUS);

  return (
    <div className="square-wrap">
      <svg
        className={cn("square-svg", view.svgIdle && "idle")}
        viewBox={SQUARE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <path className="square-frame-border" d={BORDER_PATH} fill="none" />
        {PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("square-side", side.state)}
              data-phase={phase}
              pathLength={1}
              d={SEGMENTS[phase]}
              style={{ strokeDashoffset: side.dashoffset }}
            />
          );
        })}
        <circle
          id="progressDot"
          className="progress-dot"
          r={DOT_RADIUS}
          cx={x}
          cy={y}
        />
      </svg>
    </div>
  );
}
