import { describe, expect, it } from "vitest";

import {
  DOT_RADIUS,
  SIDE_COORDS,
  SIDE_PATHS,
  SQUARE_BASE_PATH,
  SQUARE_VIEWBOX,
  interpolateDot,
  strokeDashoffset,
} from "@/presentation/geometry";

describe("square geometry", () => {
  it("matches the square SVG viewBox and base path", () => {
    expect(SQUARE_VIEWBOX).toBe("0 0 400 400");
    expect(SQUARE_BASE_PATH).toBe("M40,360 L40,40 L360,40 L360,360 Z");
  });

  it("matches inhale, hold, exhale, and rest side paths", () => {
    expect(SIDE_PATHS.inhale).toBe("M40,360 L40,40");
    expect(SIDE_PATHS.hold).toBe("M40,40 L360,40");
    expect(SIDE_PATHS.exhale).toBe("M360,40 L360,360");
    expect(SIDE_PATHS.rest).toBe("M360,360 L40,360");
  });

  it("places the idle progress dot at the inhale origin with radius 7", () => {
    expect(DOT_RADIUS).toBe(7);
    expect(interpolateDot("inhale", 0)).toEqual({ x: 40, y: 360 });
  });

  it("interpolates the dot linearly along the active side", () => {
    expect(interpolateDot("inhale", 0.5)).toEqual({ x: 40, y: 200 });
    expect(interpolateDot("hold", 1)).toEqual({ x: 360, y: 40 });
    expect(interpolateDot("exhale", 0)).toEqual({ x: 360, y: 40 });
    expect(interpolateDot("rest", 0.5)).toEqual({ x: 200, y: 360 });
  });

  it("maps side states to stroke-dashoffset from 1 to 0", () => {
    expect(strokeDashoffset("pending", 0.4)).toBe("1");
    expect(strokeDashoffset("completed", 0.4)).toBe("0");
    expect(strokeDashoffset("active", 0)).toBe("1");
    expect(strokeDashoffset("active", 0.25)).toBe("0.75");
    expect(strokeDashoffset("active", 1)).toBe("0");
  });

  it("uses the same vertex coordinates as the SVG paths", () => {
    expect(SIDE_COORDS.inhale).toEqual({ x1: 40, y1: 360, x2: 40, y2: 40 });
    expect(SIDE_COORDS.hold).toEqual({ x1: 40, y1: 40, x2: 360, y2: 40 });
    expect(SIDE_COORDS.exhale).toEqual({ x1: 360, y1: 40, x2: 360, y2: 360 });
    expect(SIDE_COORDS.rest).toEqual({ x1: 360, y1: 360, x2: 40, y2: 360 });
  });
});
