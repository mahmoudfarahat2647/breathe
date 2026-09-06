import type { Phase, SideState } from "@/domain/phase";

export const SQUARE_VIEWBOX = "0 0 400 400";
export const DOT_RADIUS = 7;
export const VIEWBOX_SIZE = 400;

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

