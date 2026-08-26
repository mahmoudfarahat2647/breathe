import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  BreathingSettings,
  createIdleBreathingState,
  startBreathing,
} from "@/domain";
import { BreathingSquare } from "@/presentation/breathing-square";
import {
  DOT_RADIUS,
  SIDE_PATHS,
  SQUARE_BASE_PATH,
  SQUARE_VIEWBOX,
} from "@/presentation/geometry";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.default();

describe("BreathingSquare", () => {
  it("renders square SVG geometry while idle", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingSquare view={view} pulse={false} />);

    const svg = container.querySelector("svg.square-svg");
    expect(svg).toHaveAttribute("viewBox", SQUARE_VIEWBOX);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("idle");
    expect(container.querySelector(".square-base")).toHaveAttribute(
      "d",
      SQUARE_BASE_PATH,
    );
    expect(container.querySelector("#side-inhale")).toHaveAttribute(
      "d",
      SIDE_PATHS.inhale,
    );
    expect(container.querySelector("#side-hold")).toHaveAttribute(
      "d",
      SIDE_PATHS.hold,
    );
    expect(container.querySelector("#side-exhale")).toHaveAttribute(
      "d",
      SIDE_PATHS.exhale,
    );
    expect(container.querySelector("#side-rest")).toHaveAttribute(
      "d",
      SIDE_PATHS.rest,
    );
    expect(container.querySelector("#side-inhale")).toHaveAttribute(
      "pathLength",
      "1",
    );

    const dot = container.querySelector("#progressDot");
    expect(dot).toHaveAttribute("r", String(DOT_RADIUS));
    expect(Number(dot?.getAttribute("cx"))).toBe(40);
    expect(Number(dot?.getAttribute("cy"))).toBe(360);
  });

  it("shows English phase labels and countdown overlay", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    render(<BreathingSquare view={view} pulse={false} />);

    expect(screen.getByText("INHALE")).toBeInTheDocument();
    expect(screen.queryByText("شهيق")).not.toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("4 seconds")).toBeInTheDocument();
  });

  it("marks the active side and removes idle after start", () => {
    const view = toBreathingViewModel(
      startBreathing(createIdleBreathingState()),
      settings,
    );
    const { container } = render(<BreathingSquare view={view} pulse />);

    expect(container.querySelector("svg.square-svg")).not.toHaveClass("idle");
    expect(container.querySelector("#side-inhale")).toHaveClass("active");
    expect(container.querySelector("#side-hold")).toHaveClass("pending");
    expect(container.querySelector("#side-rest")).toHaveClass("pending");
    expect(container.querySelector("#squareContent")).toHaveClass("pulse");
  });
});
