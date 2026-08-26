import type { Phase, SideState } from "@/domain/phase";

export const SQUARE_VIEWBOX = "0 0 400 400";
export const SQUARE_BASE_PATH = "M40,360 L40,40 L360,40 L360,360 Z";
export const TRIANGLE_VIEWBOX = "0 0 400 400";
export const TRIANGLE_BASE_PATH = "M40,360 L200,40 L360,360 Z";
export const DOT_RADIUS = 7;

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
