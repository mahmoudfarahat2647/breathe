import { describe, expect, it } from "vitest";

import {
  DOT_RADIUS,
  SIDE_COORDS,
  SIDE_PATHS,
  TRIANGLE_BASE_PATH,
  TRIANGLE_VIEWBOX,
  interpolateDot,
  strokeDashoffset,
} from "@/presentation/geometry";

describe("triangle geometry", () => {
  it("matches the reference SVG viewBox and base path", () => {
    expect(TRIANGLE_VIEWBOX).toBe("0 0 400 366");
    expect(TRIANGLE_BASE_PATH).toBe("M200,39 L365,325 L35,325 Z");
  });

  it("matches inhale, hold, and exhale side paths", () => {
    expect(SIDE_PATHS.inhale).toBe("M35,325 L200,39");
    expect(SIDE_PATHS.hold).toBe("M200,39 L365,325");
    expect(SIDE_PATHS.exhale).toBe("M365,325 L35,325");
  });

  it("places the idle progress dot at the inhale origin with radius 7", () => {
    expect(DOT_RADIUS).toBe(7);
    expect(interpolateDot("inhale", 0)).toEqual({ x: 35, y: 325 });
  });

  it("interpolates the dot linearly along the active side", () => {
    expect(interpolateDot("inhale", 0.5)).toEqual({ x: 117.5, y: 182 });
    expect(interpolateDot("hold", 1)).toEqual({ x: 365, y: 325 });
    expect(interpolateDot("exhale", 0)).toEqual({ x: 365, y: 325 });
  });

  it("maps side states to stroke-dashoffset from 1 to 0", () => {
    expect(strokeDashoffset("pending", 0.4)).toBe("1");
    expect(strokeDashoffset("completed", 0.4)).toBe("0");
    expect(strokeDashoffset("active", 0)).toBe("1");
    expect(strokeDashoffset("active", 0.25)).toBe("0.75");
    expect(strokeDashoffset("active", 1)).toBe("0");
  });

  it("uses the same vertex coordinates as the SVG paths", () => {
    expect(SIDE_COORDS.inhale).toEqual({ x1: 35, y1: 325, x2: 200, y2: 39 });
    expect(SIDE_COORDS.hold).toEqual({ x1: 200, y1: 39, x2: 365, y2: 325 });
    expect(SIDE_COORDS.exhale).toEqual({ x1: 365, y1: 325, x2: 35, y2: 325 });
  });
});
