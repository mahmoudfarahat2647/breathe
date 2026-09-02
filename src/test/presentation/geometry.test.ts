import { describe, expect, it } from "vitest";
import type { Phase } from "@/domain/phase";
import {
  DOT_RADIUS,
  SIDE_COORDS,
  SIDE_PATHS,
  SQUARE_BASE_PATH,
  SQUARE_VIEWBOX,
  TRIANGLE_BASE_PATH,
  TRIANGLE_SIDE_PATHS,
  TRIANGLE_VIEWBOX,
  VIEWBOX_SIZE,
  interpolateDot,
  interpolateTriangleDot,
  pointOnRoundedSegment,
  roundedPerimeterSegments,
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

describe("triangle geometry", () => {
  it("matches the triangle SVG viewBox and base path", () => {
    expect(TRIANGLE_VIEWBOX).toBe("0 0 400 400");
    expect(TRIANGLE_BASE_PATH).toBe("M40,360 L200,40 L360,360 Z");
  });

  it("matches inhale, hold, and exhale triangle side paths", () => {
    expect(TRIANGLE_SIDE_PATHS.inhale).toBe("M40,360 L200,40");
    expect(TRIANGLE_SIDE_PATHS.hold).toBe("M200,40 L360,360");
    expect(TRIANGLE_SIDE_PATHS.exhale).toBe("M360,360 L40,360");
  });

  it("interpolates the triangle dot along each slanted side", () => {
    expect(interpolateTriangleDot("inhale", 0)).toEqual({ x: 40, y: 360 });
    expect(interpolateTriangleDot("inhale", 0.5)).toEqual({ x: 120, y: 200 });
    expect(interpolateTriangleDot("hold", 1)).toEqual({ x: 360, y: 360 });
    expect(interpolateTriangleDot("exhale", 0.5)).toEqual({ x: 200, y: 360 });
  });
});

describe("roundedPerimeterSegments", () => {
  it("returns all four Phase keys with non-empty strings starting with M", () => {
    const segments = roundedPerimeterSegments(0, 32);
    const expectedPhases: Phase[] = ["inhale", "hold", "exhale", "rest"];
    expect(Object.keys(segments)).toEqual(expectedPhases);

    for (const phase of expectedPhases) {
      const d = segments[phase];
      expect(typeof d).toBe("string");
      expect(d.length).toBeGreaterThan(0);
      expect(d.startsWith("M")).toBe(true);
    }
  });

  function parsePathEndpoints(d: string): {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } {
    const startMatch = d.match(/^M(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const endMatch = d.match(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if (!startMatch || !endMatch) {
      throw new Error(`Failed to parse path endpoints from "${d}"`);
    }
    return {
      start: { x: Number(startMatch[1]), y: Number(startMatch[2]) },
      end: { x: Number(endMatch[1]), y: Number(endMatch[2]) },
    };
  }

  const cases = [
    { inset: 0, radius: 32 },
    { inset: -0.5, radius: 32 },
  ];

  for (const { inset, radius } of cases) {
    it(`produces contiguous clockwise segments with inset=${inset} and radius=${radius}`, () => {
      const segments = roundedPerimeterSegments(inset, radius);
      const phases: Phase[] = ["inhale", "hold", "exhale", "rest"];

      for (let i = 0; i < phases.length; i++) {
        const current = phases[i];
        const next = phases[(i + 1) % phases.length];

        const currentEndpoints = parsePathEndpoints(segments[current]);
        const nextEndpoints = parsePathEndpoints(segments[next]);

        expect(currentEndpoints.end.x).toBeCloseTo(nextEndpoints.start.x, 6);
        expect(currentEndpoints.end.y).toBeCloseTo(nextEndpoints.start.y, 6);
      }
    });
  }

  it("matches the exact formula strings for inset 0 and radius 32", () => {
    const segments = roundedPerimeterSegments(0, 32);
    expect(segments.inhale).toBe("M0,368 L0,32 A32,32 0 0 1 32,0");
    expect(segments.hold).toBe("M32,0 L368,0 A32,32 0 0 1 400,32");
    expect(segments.exhale).toBe("M400,32 L400,368 A32,32 0 0 1 368,400");
    expect(segments.rest).toBe("M368,400 L32,400 A32,32 0 0 1 0,368");
  });
});

describe("pointOnRoundedSegment", () => {
  const cases = [
    {
      inset: 0,
      radius: 32,
      startPoints: {
        inhale: { x: 0, y: 368 },
        hold: { x: 32, y: 0 },
        exhale: { x: 400, y: 32 },
        rest: { x: 368, y: 400 },
      },
      endPoints: {
        inhale: { x: 32, y: 0 },
        hold: { x: 400, y: 32 },
        exhale: { x: 368, y: 400 },
        rest: { x: 0, y: 368 },
      },
      centers: {
        inhale: { cx: 32, cy: 32 },
        hold: { cx: 368, cy: 32 },
        exhale: { cx: 368, cy: 368 },
        rest: { cx: 32, cy: 368 },
      },
    },
    {
      inset: -0.5,
      radius: 32,
      startPoints: {
        inhale: { x: -0.5, y: 368.5 },
        hold: { x: 31.5, y: -0.5 },
        exhale: { x: 400.5, y: 31.5 },
        rest: { x: 368.5, y: 400.5 },
      },
      endPoints: {
        inhale: { x: 31.5, y: -0.5 },
        hold: { x: 400.5, y: 31.5 },
        exhale: { x: 368.5, y: 400.5 },
        rest: { x: -0.5, y: 368.5 },
      },
      centers: {
        inhale: { cx: 31.5, cy: 31.5 },
        hold: { cx: 368.5, cy: 31.5 },
        exhale: { cx: 368.5, cy: 368.5 },
        rest: { cx: 31.5, cy: 368.5 },
      },
    },
  ];

  for (const { inset, radius, startPoints, endPoints, centers } of cases) {
    it(`returns straight start at progress 0 and arc end at progress 1 for inset=${inset}`, () => {
      const phases: Phase[] = ["inhale", "hold", "exhale", "rest"];
      for (const phase of phases) {
        const p0 = pointOnRoundedSegment(phase, 0, inset, radius);
        expect(p0.x).toBeCloseTo(startPoints[phase].x, 6);
        expect(p0.y).toBeCloseTo(startPoints[phase].y, 6);

        const p1 = pointOnRoundedSegment(phase, 1, inset, radius);
        expect(p1.x).toBeCloseTo(endPoints[phase].x, 6);
        expect(p1.y).toBeCloseTo(endPoints[phase].y, 6);
      }
    });

    it(`places arc angular midpoint on the corner circle for inset=${inset}`, () => {
      const nearTangent = inset + radius;
      const farTangent = VIEWBOX_SIZE - inset - radius;
      const lStraight = farTangent - nearTangent;
      const lArc = radius * (Math.PI / 2);
      const total = lStraight + lArc;
      const arcMidProgress = (lStraight + lArc / 2) / total;

      const phases: Phase[] = ["inhale", "hold", "exhale", "rest"];
      for (const phase of phases) {
        const pt = pointOnRoundedSegment(phase, arcMidProgress, inset, radius);
        const dist = Math.hypot(pt.x - centers[phase].cx, pt.y - centers[phase].cy);
        expect(dist).toBeCloseTo(radius, 6);
      }
    });
  }

  it("clamps progress outside [0, 1]", () => {
    const phases: Phase[] = ["inhale", "hold", "exhale", "rest"];
    for (const phase of phases) {
      const atZero = pointOnRoundedSegment(phase, 0, 0, 32);
      const atOne = pointOnRoundedSegment(phase, 1, 0, 32);

      const belowZero = pointOnRoundedSegment(phase, -0.5, 0, 32);
      const farBelowZero = pointOnRoundedSegment(phase, -100, 0, 32);
      const aboveOne = pointOnRoundedSegment(phase, 1.5, 0, 32);
      const farAboveOne = pointOnRoundedSegment(phase, 100, 0, 32);

      expect(belowZero.x).toBeCloseTo(atZero.x, 6);
      expect(belowZero.y).toBeCloseTo(atZero.y, 6);
      expect(farBelowZero.x).toBeCloseTo(atZero.x, 6);
      expect(farBelowZero.y).toBeCloseTo(atZero.y, 6);

      expect(aboveOne.x).toBeCloseTo(atOne.x, 6);
      expect(aboveOne.y).toBeCloseTo(atOne.y, 6);
      expect(farAboveOne.x).toBeCloseTo(atOne.x, 6);
      expect(farAboveOne.y).toBeCloseTo(atOne.y, 6);
    }
  });

  it("moves monotonically along the straight run and across the segment", () => {
    const inset = 0;
    const radius = 32;
    const lStraight = 368 - 32;
    const lArc = 32 * (Math.PI / 2);
    const total = lStraight + lArc;
    const straightProgressLimit = lStraight / total;

    // Verify straight run strict monotonicity
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const progA = (i / steps) * straightProgressLimit;
      const progB = ((i + 1) / steps) * straightProgressLimit;

      // Inhale: x is constant (0), y strictly decreases
      const inhA = pointOnRoundedSegment("inhale", progA, inset, radius);
      const inhB = pointOnRoundedSegment("inhale", progB, inset, radius);
      expect(inhA.x).toBeCloseTo(0, 6);
      expect(inhB.x).toBeCloseTo(0, 6);
      expect(inhB.y).toBeLessThan(inhA.y);

      // Hold: y is constant (0), x strictly increases
      const hldA = pointOnRoundedSegment("hold", progA, inset, radius);
      const hldB = pointOnRoundedSegment("hold", progB, inset, radius);
      expect(hldA.y).toBeCloseTo(0, 6);
      expect(hldB.y).toBeCloseTo(0, 6);
      expect(hldB.x).toBeGreaterThan(hldA.x);

      // Exhale: x is constant (400), y strictly increases
      const exhA = pointOnRoundedSegment("exhale", progA, inset, radius);
      const exhB = pointOnRoundedSegment("exhale", progB, inset, radius);
      expect(exhA.x).toBeCloseTo(400, 6);
      expect(exhB.x).toBeCloseTo(400, 6);
      expect(exhB.y).toBeGreaterThan(exhA.y);

      // Rest: y is constant (400), x strictly decreases
      const rstA = pointOnRoundedSegment("rest", progA, inset, radius);
      const rstB = pointOnRoundedSegment("rest", progB, inset, radius);
      expect(rstA.y).toBeCloseTo(400, 6);
      expect(rstB.y).toBeCloseTo(400, 6);
      expect(rstB.x).toBeLessThan(rstA.x);
    }

    // Verify overall segment progression monotonicity across [0, 1]
    const fullSteps = 50;
    for (let i = 0; i < fullSteps; i++) {
      const progA = i / fullSteps;
      const progB = (i + 1) / fullSteps;

      const inhA = pointOnRoundedSegment("inhale", progA, inset, radius);
      const inhB = pointOnRoundedSegment("inhale", progB, inset, radius);
      expect(inhB.y).toBeLessThan(inhA.y);

      const hldA = pointOnRoundedSegment("hold", progA, inset, radius);
      const hldB = pointOnRoundedSegment("hold", progB, inset, radius);
      expect(hldB.x).toBeGreaterThan(hldA.x);

      const exhA = pointOnRoundedSegment("exhale", progA, inset, radius);
      const exhB = pointOnRoundedSegment("exhale", progB, inset, radius);
      expect(exhB.y).toBeGreaterThan(exhA.y);

      const rstA = pointOnRoundedSegment("rest", progA, inset, radius);
      const rstB = pointOnRoundedSegment("rest", progB, inset, radius);
      expect(rstB.x).toBeLessThan(rstA.x);
    }
  });
});
