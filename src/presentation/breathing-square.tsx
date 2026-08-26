import { PHASES } from "@/domain/phase";
import {
  DOT_RADIUS,
  SIDE_PATHS,
  SQUARE_BASE_PATH,
  SQUARE_VIEWBOX,
} from "./geometry";
import type { BreathingViewModel } from "./view-model";
import { cn } from "@/lib/utils";

type BreathingSquareProps = {
  view: BreathingViewModel;
  pulse?: boolean;
  pulseKey?: number;
};

export function BreathingSquare({
  view,
  pulse = false,
  pulseKey = 0,
}: BreathingSquareProps) {
  return (
    <div className="square-wrap">
      <svg
        className={cn("square-svg", view.svgIdle && "idle")}
        viewBox={SQUARE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <path className="square-base" d={SQUARE_BASE_PATH} />
        {PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("square-side", side.state)}
              data-phase={phase}
              pathLength={1}
              d={SIDE_PATHS[phase]}
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
