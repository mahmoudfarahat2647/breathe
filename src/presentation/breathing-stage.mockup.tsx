"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { PHASES, type Phase } from "@/domain/phase";
import { cn } from "@/lib/utils";
import { DOT_RADIUS, SQUARE_VIEWBOX } from "./geometry";
import type { BreathingViewModel } from "./view-model";

// Tune these viewBox units to sit on the `.mv-square-frame` border.
const INSET = -0.5;
const RADIUS = 32;
const VIEWBOX_SIZE = 400;

type Point = { x: number; y: number };

function roundedPerimeterSegments(
  inset: number,
  radius: number,
): Record<Phase, string> {
  const near = inset;
  const far = VIEWBOX_SIZE - inset;
  const nearTangent = near + radius;
  const farTangent = far - radius;

  return {
    inhale: `M${near},${farTangent} L${near},${nearTangent} A${radius},${radius} 0 0 1 ${nearTangent},${near}`,
    hold: `M${nearTangent},${near} L${farTangent},${near} A${radius},${radius} 0 0 1 ${far},${nearTangent}`,
    exhale: `M${far},${nearTangent} L${far},${farTangent} A${radius},${radius} 0 0 1 ${farTangent},${far}`,
    rest: `M${farTangent},${far} L${nearTangent},${far} A${radius},${radius} 0 0 1 ${near},${farTangent}`,
  };
}

const SEGMENTS = roundedPerimeterSegments(INSET, RADIUS);
const INHALE_START: Point = {
  x: INSET,
  y: VIEWBOX_SIZE - INSET - RADIUS,
};

export function BreathingStageMockup({
  view,
}: {
  view: BreathingViewModel;
}) {
  const pathRefs = useRef<Partial<Record<Phase, SVGPathElement | null>>>({});
  const [dot, setDot] = useState<Point>(INHALE_START);
  const activeDashoffset = view.sides[view.phase].dashoffset;

  useLayoutEffect(() => {
    const storeDot = (point: Point) => {
      const animationFrame = window.requestAnimationFrame(() => setDot(point));
      return () => window.cancelAnimationFrame(animationFrame);
    };

    if (view.svgIdle) {
      return storeDot(INHALE_START);
    }

    const activePath = pathRefs.current[view.phase];
    if (
      !activePath ||
      typeof activePath.getTotalLength !== "function" ||
      typeof activePath.getPointAtLength !== "function"
    ) {
      return storeDot(INHALE_START);
    }

    const progress = Math.min(
      1,
      Math.max(0, 1 - Number(activeDashoffset)),
    );
    if (!Number.isFinite(progress)) {
      return storeDot(INHALE_START);
    }

    const length = activePath.getTotalLength();
    const point = activePath.getPointAtLength(progress * length);
    return storeDot({ x: point.x, y: point.y });
  }, [view.phase, activeDashoffset, view.svgIdle]);

  return (
    <div className="square-wrap">
      <svg
        className={cn("square-svg", view.svgIdle && "idle")}
        viewBox={SQUARE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        {PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("square-side", side.state)}
              data-phase={phase}
              pathLength={1}
              ref={(path) => {
                pathRefs.current[phase] = path;
              }}
              d={SEGMENTS[phase]}
              style={{ strokeDashoffset: side.dashoffset }}
            />
          );
        })}
        <circle
          id="progressDot"
          className="progress-dot"
          r={DOT_RADIUS}
          cx={dot.x}
          cy={dot.y}
        />
      </svg>
    </div>
  );
}
