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
  SIDE_PATHS,
  TRIANGLE_BASE_PATH,
  TRIANGLE_VIEWBOX,
} from "@/presentation/geometry";
import { toBreathingViewModel } from "@/presentation/view-model";

const settings = BreathingSettings.default();

describe("BreathingTriangle", () => {
  it("renders reference SVG geometry while idle", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingTriangle view={view} pulse={false} />);

    const svg = container.querySelector("svg.triangle-svg");
    expect(svg).toHaveAttribute("viewBox", TRIANGLE_VIEWBOX);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("idle");
    expect(container.querySelector(".triangle-base")).toHaveAttribute(
      "d",
      TRIANGLE_BASE_PATH,
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
    expect(container.querySelector("#side-inhale")).toHaveAttribute(
      "pathLength",
      "1",
    );

    const dot = container.querySelector("#progressDot");
    expect(dot).toHaveAttribute("r", String(DOT_RADIUS));
    expect(Number(dot?.getAttribute("cx"))).toBe(35);
    expect(Number(dot?.getAttribute("cy"))).toBe(325);
  });

  it("shows bilingual phase labels and countdown overlay", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    render(<BreathingTriangle view={view} pulse={false} />);

    expect(screen.getByText("INHALE")).toBeInTheDocument();
    expect(screen.getByText("شهيق")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("4 seconds")).toBeInTheDocument();
  });

  it("marks the active side and removes idle after start", () => {
    const view = toBreathingViewModel(
      startBreathing(createIdleBreathingState()),
      settings,
    );
    const { container } = render(<BreathingTriangle view={view} pulse />);

    expect(container.querySelector("svg.triangle-svg")).not.toHaveClass("idle");
    expect(container.querySelector("#side-inhale")).toHaveClass("active");
    expect(container.querySelector("#side-hold")).toHaveClass("pending");
    expect(container.querySelector("#triangleContent")).toHaveClass("pulse");
  });
});
