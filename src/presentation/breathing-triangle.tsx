import { TRIANGLE_PHASES } from "./geometry";
import {
  DOT_RADIUS,
  TRIANGLE_BASE_PATH,
  TRIANGLE_SIDE_PATHS,
  TRIANGLE_VIEWBOX,
} from "./geometry";
import type { BreathingViewModel } from "./view-model";
import { cn } from "@/lib/utils";

type BreathingTriangleProps = {
  view: BreathingViewModel;
  pulse?: boolean;
  pulseKey?: number;
};

export function BreathingTriangle({
  view,
  pulse = false,
  pulseKey = 0,
}: BreathingTriangleProps) {
  return (
    <div className="square-wrap">
      <svg
        className={cn("square-svg", view.svgIdle && "idle")}
        viewBox={TRIANGLE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <path className="square-base" d={TRIANGLE_BASE_PATH} />
        {TRIANGLE_PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("square-side", side.state)}
              data-phase={phase}
              pathLength={1}
              d={TRIANGLE_SIDE_PATHS[phase]}
              style={{ strokeDashoffset: side.dashoffset }}
            />
          );
        })}
        <circle
          id="progressDot"
          className="progress-dot"
          r={DOT_RADIUS}
          cx={view.dot.x}
          cy={view.dot.y}
        />
      </svg>

      <div
        key={pulseKey}
        className={cn("square-content", pulse && "pulse")}
        id="squareContent"
      >
        <span className="phase-en">{view.phaseEn}</span>
        <span className="countdown">{view.countdown}</span>
        <span className="duration-hint">{view.durationHint}</span>
      </div>
    </div>
  );
}
