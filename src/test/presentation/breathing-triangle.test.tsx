import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import { BreathingTriangle } from "@/presentation/breathing-triangle";
import {
  DOT_RADIUS,
  TRIANGLE_BASE_PATH,
  TRIANGLE_SIDE_PATHS,
  TRIANGLE_VIEWBOX,
} from "@/presentation/geometry";
import { toBreathingViewModel } from "@/presentation/view-model";

describe("BreathingTriangle", () => {
  it("renders triangle SVG geometry with three sides", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingTriangle view={view} pulse={false} />);

    const svg = container.querySelector("svg.square-svg");
    expect(svg).toHaveAttribute("viewBox", TRIANGLE_VIEWBOX);
    expect(container.querySelector(".square-base")).toHaveAttribute(
      "d",
      TRIANGLE_BASE_PATH,
    );
    expect(container.querySelector("#side-inhale")).toHaveAttribute(
      "d",
      TRIANGLE_SIDE_PATHS.inhale,
    );
    expect(container.querySelector("#side-hold")).toHaveAttribute(
      "d",
      TRIANGLE_SIDE_PATHS.hold,
    );
    expect(container.querySelector("#side-exhale")).toHaveAttribute(
      "d",
      TRIANGLE_SIDE_PATHS.exhale,
    );
    expect(container.querySelector("#side-rest")).not.toBeInTheDocument();

    const dot = container.querySelector("#progressDot");
    expect(dot).toHaveAttribute("r", String(DOT_RADIUS));
    expect(Number(dot?.getAttribute("cx"))).toBe(40);
    expect(Number(dot?.getAttribute("cy"))).toBe(360);
  });

  it("shows English phase labels and countdown overlay", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    render(<BreathingTriangle view={view} pulse={false} />);

    expect(screen.getByText("INHALE")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("4 seconds")).toBeInTheDocument();
  });

  it("marks the active side and removes idle after start", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 0,
    });
    const view = toBreathingViewModel(
      startBreathing(createIdleBreathingState()),
      settings,
    );
    const { container } = render(<BreathingTriangle view={view} pulse />);

    expect(container.querySelector("svg.square-svg")).not.toHaveClass("idle");
    expect(container.querySelector("#side-inhale")).toHaveClass("active");
    expect(container.querySelector("#side-hold")).toHaveClass("pending");
  });
});
