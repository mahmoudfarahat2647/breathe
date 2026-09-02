import fs from "node:fs";
import path from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  advanceBreathingState,
  BreathingSettings,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import { BreatheAppMockup } from "@/presentation/breathe-app.mockup";
import { BreathingStage } from "@/presentation/breathing-stage";
import {
  DOT_RADIUS,
  pointOnRoundedSegment,
  roundedPerimeterSegments,
  SQUARE_VIEWBOX,
} from "@/presentation/geometry";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.default();
const INSET = -0.5;
const RADIUS = 32;

describe("BreathingStage", () => {
  it("renders idle SVG geometry with correct classes, attributes, and idle dot coordinates", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingStage view={view} />);

    const wrap = container.querySelector(".square-wrap");
    expect(wrap).not.toBeNull();

    const svg = container.querySelector("svg.square-svg");
    expect(svg).toHaveAttribute("viewBox", SQUARE_VIEWBOX);
    expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("idle");

    const border = container.querySelector(".square-frame-border");
    expect(border).not.toBeNull();
    expect(border).toHaveAttribute("fill", "none");
    const segments = roundedPerimeterSegments(INSET, RADIUS);
    expect(border?.getAttribute("d")).toBe(
      `${segments.inhale} ${segments.hold} ${segments.exhale} ${segments.rest}`,
    );

    const expectedIdlePoint = pointOnRoundedSegment("inhale", 0, INSET, RADIUS);
    const dotById = container.querySelector("#progressDot");
    const dotByClass = container.querySelector(".progress-dot");
    expect(dotById).not.toBeNull();
    expect(dotById).toBe(dotByClass);
    expect(dotById).toHaveAttribute("r", String(DOT_RADIUS));
    expect(Number(dotById?.getAttribute("cx"))).toBeCloseTo(expectedIdlePoint.x, 5);
    expect(Number(dotById?.getAttribute("cy"))).toBeCloseTo(expectedIdlePoint.y, 5);
  });

  it("renders all four sides with d attribute, pathLength='1', and correct state classes", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingStage view={view} />);

    const phases = ["inhale", "hold", "exhale", "rest"] as const;
    for (const phase of phases) {
      const side = container.querySelector(`#side-${phase}`);
      expect(side).not.toBeNull();
      expect(side).toHaveClass("square-side");
      expect(side).toHaveAttribute("data-phase", phase);
      expect(side).toHaveAttribute("pathLength", "1");
      expect(side?.getAttribute("d")).toBeTruthy();
    }
  });

  it("updates dot coordinates analytically and removes idle class when running at mid-progress", () => {
    const started = startBreathing(createIdleBreathingState());
    // Default inhale duration is 4s; advance in two 1s steps for 50% progress (delta clamps at 1s)
    const step1 = advanceBreathingState(
      { ...started, lastFrameTimeMs: 0 },
      1000,
      settings,
    );
    const runningState = advanceBreathingState(step1, 2000, settings);
    const view = toBreathingViewModel(runningState, settings);
    expect(view.phase).toBe("inhale");
    expect(view.sides.inhale.state).toBe("active");

    const progress = 1 - Number(view.sides.inhale.dashoffset);
    expect(progress).toBeCloseTo(0.5, 3);

    const { container } = render(<BreathingStage view={view} />);

    const svg = container.querySelector("svg.square-svg");
    expect(svg).not.toHaveClass("idle");
    expect(svg).toHaveAttribute("aria-hidden", "true");

    const activeSide = container.querySelector("#side-inhale");
    expect(activeSide).toHaveClass("active");

    const expectedRunningPoint = pointOnRoundedSegment(
      "inhale",
      progress,
      INSET,
      RADIUS,
    );
    const dot = container.querySelector("#progressDot");
    expect(Number(dot?.getAttribute("cx"))).toBeCloseTo(expectedRunningPoint.x, 5);
    expect(Number(dot?.getAttribute("cy"))).toBeCloseTo(expectedRunningPoint.y, 5);
  });

  it("updates dot coordinates when running in hold phase", () => {
    const started = startBreathing(createIdleBreathingState());
    // Inhale is 4s, advance 4 times by 1s to reach hold start, then 1s into hold
    let state = started;
    for (let time = 1000; time <= 5000; time += 1000) {
      state = advanceBreathingState(
        { ...state, lastFrameTimeMs: time - 1000 },
        time,
        settings,
      );
    }
    const view = toBreathingViewModel(state, settings);
    expect(view.phase).toBe("hold");
    expect(view.sides.inhale.state).toBe("completed");
    expect(view.sides.hold.state).toBe("active");

    const progress = 1 - Number(view.sides.hold.dashoffset);
    expect(progress).toBeCloseTo(0.25, 3);

    const { container } = render(<BreathingStage view={view} />);
    const expectedPoint = pointOnRoundedSegment("hold", progress, INSET, RADIUS);
    const dot = container.querySelector("#progressDot");
    expect(Number(dot?.getAttribute("cx"))).toBeCloseTo(expectedPoint.x, 5);
    expect(Number(dot?.getAttribute("cy"))).toBeCloseTo(expectedPoint.y, 5);
  });

  it("does not call DOM measurement functions or contain getPointAtLength / getTotalLength", () => {
    const stageFilePath = path.resolve(__dirname, "../../presentation/breathing-stage.tsx");
    const stageCode = fs.readFileSync(stageFilePath, "utf-8");

    expect(stageCode).not.toContain("getPointAtLength");
    expect(stageCode).not.toContain("getTotalLength");
    expect(stageCode).not.toContain("requestAnimationFrame");
    expect(stageCode).not.toContain("useLayoutEffect");
  });

  it("renders correctly within BreatheAppMockup", () => {
    const { container } = render(<BreatheAppMockup />);
    const stage = container.querySelector(".mv-square-frame .square-wrap .square-svg");
    expect(stage).not.toBeNull();
    expect(container.querySelector(".square-frame-border")).not.toBeNull();
    expect(container.querySelector("#side-inhale")).not.toBeNull();
  });
});
