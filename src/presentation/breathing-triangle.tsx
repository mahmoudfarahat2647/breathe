import { PHASES } from "@/domain/phase";
import {
  DOT_RADIUS,
  SIDE_PATHS,
  TRIANGLE_BASE_PATH,
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
    <div className="triangle-wrap">
      <svg
        className={cn("triangle-svg", view.svgIdle && "idle")}
        viewBox={TRIANGLE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <path className="triangle-base" d={TRIANGLE_BASE_PATH} />
        {PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("triangle-side", side.state)}
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
        className={cn("triangle-content", pulse && "pulse")}
        id="triangleContent"
      >
        <span className="phase-en">{view.phaseEn}</span>
        <span className="phase-ar" lang="ar" dir="rtl">
          {view.phaseAr}
        </span>
        <span className="countdown">{view.countdown}</span>
        <span className="duration-hint">{view.durationHint}</span>
      </div>
    </div>
  );
}
