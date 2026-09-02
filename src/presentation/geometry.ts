import type { Phase, SideState } from "@/domain/phase";

export const SQUARE_VIEWBOX = "0 0 400 400";
export const SQUARE_BASE_PATH = "M40,360 L40,40 L360,40 L360,360 Z";
export const TRIANGLE_VIEWBOX = "0 0 400 400";
export const TRIANGLE_BASE_PATH = "M40,360 L200,40 L360,360 Z";
export const DOT_RADIUS = 7;
export const VIEWBOX_SIZE = 400;

export const SIDE_PATHS: Record<Phase, string> = {
  inhale: "M40,360 L40,40",
  hold: "M40,40 L360,40",
  exhale: "M360,40 L360,360",
  rest: "M360,360 L40,360",
};

export const TRIANGLE_SIDE_PATHS: Record<"inhale" | "hold" | "exhale", string> = {
  inhale: "M40,360 L200,40",
  hold: "M200,40 L360,360",
  exhale: "M360,360 L40,360",
};

export const SIDE_COORDS: Record<
  Phase,
  { x1: number; y1: number; x2: number; y2: number }
> = {
  inhale: { x1: 40, y1: 360, x2: 40, y2: 40 },
  hold: { x1: 40, y1: 40, x2: 360, y2: 40 },
  exhale: { x1: 360, y1: 40, x2: 360, y2: 360 },
  rest: { x1: 360, y1: 360, x2: 40, y2: 360 },
};

export const TRIANGLE_SIDE_COORDS: Record<
  "inhale" | "hold" | "exhale",
  { x1: number; y1: number; x2: number; y2: number }
> = {
  inhale: { x1: 40, y1: 360, x2: 200, y2: 40 },
  hold: { x1: 200, y1: 40, x2: 360, y2: 360 },
  exhale: { x1: 360, y1: 360, x2: 40, y2: 360 },
};

export const TRIANGLE_PHASES = ["inhale", "hold", "exhale"] as const;
export type TrianglePhase = (typeof TRIANGLE_PHASES)[number];

export function interpolateDot(
  phase: Phase,
  progress: number,
): { x: number; y: number } {
  const coords = SIDE_COORDS[phase];
  return {
    x: coords.x1 + (coords.x2 - coords.x1) * progress,
    y: coords.y1 + (coords.y2 - coords.y1) * progress,
  };
}

export function interpolateTriangleDot(
  phase: TrianglePhase,
  progress: number,
): { x: number; y: number } {
  const coords = TRIANGLE_SIDE_COORDS[phase];
  return {
    x: coords.x1 + (coords.x2 - coords.x1) * progress,
    y: coords.y1 + (coords.y2 - coords.y1) * progress,
  };
}

export function strokeDashoffset(state: SideState, progress: number): string {
  if (state === "completed") return "0";
  if (state === "pending") return "1";
  return String(1 - progress);
}

export function roundedPerimeterSegments(
  inset: number,
  radius: number,
): Record<Phase, string> {
  const size = VIEWBOX_SIZE;
  const near = inset;
  const far = size - inset;
  const nearTangent = near + radius;
  const farTangent = far - radius;

  return {
    inhale: `M${near},${farTangent} L${near},${nearTangent} A${radius},${radius} 0 0 1 ${nearTangent},${near}`,
    hold: `M${nearTangent},${near} L${farTangent},${near} A${radius},${radius} 0 0 1 ${far},${nearTangent}`,
    exhale: `M${far},${nearTangent} L${far},${farTangent} A${radius},${radius} 0 0 1 ${farTangent},${far}`,
    rest: `M${farTangent},${far} L${nearTangent},${far} A${radius},${radius} 0 0 1 ${near},${farTangent}`,
  };
}

export function pointOnRoundedSegment(
  phase: Phase,
  progress: number,
  inset: number,
  radius: number,
  size: number = VIEWBOX_SIZE,
): { x: number; y: number } {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const near = inset;
  const far = size - inset;
  const nearTangent = near + radius;
  const farTangent = far - radius;

  let startX: number;
  let startY: number;
  let straightEndX: number;
  let straightEndY: number;
  let arcEndX: number;
  let arcEndY: number;
  let cx: number;
  let cy: number;
  let startAngle: number;

  switch (phase) {
    case "inhale":
      startX = near;
      startY = farTangent;
      straightEndX = near;
      straightEndY = nearTangent;
      arcEndX = nearTangent;
      arcEndY = near;
      cx = nearTangent;
      cy = nearTangent;
      startAngle = Math.PI;
      break;
    case "hold":
      startX = nearTangent;
      startY = near;
      straightEndX = farTangent;
      straightEndY = near;
      arcEndX = far;
      arcEndY = nearTangent;
      cx = farTangent;
      cy = nearTangent;
      startAngle = -Math.PI / 2;
      break;
    case "exhale":
      startX = far;
      startY = nearTangent;
      straightEndX = far;
      straightEndY = farTangent;
      arcEndX = farTangent;
      arcEndY = far;
      cx = farTangent;
      cy = farTangent;
      startAngle = 0;
      break;
    case "rest":
      startX = farTangent;
      startY = far;
      straightEndX = nearTangent;
      straightEndY = far;
      arcEndX = near;
      arcEndY = farTangent;
      cx = nearTangent;
      cy = farTangent;
      startAngle = Math.PI / 2;
      break;
  }

  if (clampedProgress === 0) {
    return { x: startX, y: startY };
  }
  if (clampedProgress === 1) {
    return { x: arcEndX, y: arcEndY };
  }

  const lStraight = Math.max(0, farTangent - nearTangent);
  const lArc = Math.max(0, radius * (Math.PI / 2));
  const total = lStraight + lArc;

  if (total <= 0) {
    return { x: startX, y: startY };
  }

  const distance = clampedProgress * total;

  if (distance <= lStraight) {
    const ratio = lStraight > 0 ? distance / lStraight : 0;
    return {
      x: startX + (straightEndX - startX) * ratio,
      y: startY + (straightEndY - startY) * ratio,
    };
  }

  const arcDistance = distance - lStraight;
  const arcFraction = lArc > 0 ? arcDistance / lArc : 0;
  const angle = startAngle + arcFraction * (Math.PI / 2);

  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

