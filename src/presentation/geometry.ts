import type { Phase, SideState } from "@/domain/phase";

export const TRIANGLE_VIEWBOX = "0 0 400 366";
export const TRIANGLE_BASE_PATH = "M200,39 L365,325 L35,325 Z";
export const DOT_RADIUS = 7;

export const SIDE_PATHS: Record<Phase, string> = {
  inhale: "M35,325 L200,39",
  hold: "M200,39 L365,325",
  exhale: "M365,325 L35,325",
};

export const SIDE_COORDS: Record<
  Phase,
  { x1: number; y1: number; x2: number; y2: number }
> = {
  inhale: { x1: 35, y1: 325, x2: 200, y2: 39 },
  hold: { x1: 200, y1: 39, x2: 365, y2: 325 },
  exhale: { x1: 365, y1: 325, x2: 35, y2: 325 },
};

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

export function strokeDashoffset(state: SideState, progress: number): string {
  if (state === "completed") return "0";
  if (state === "pending") return "1";
  return String(1 - progress);
}
