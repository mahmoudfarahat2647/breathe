import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AmbientBackground } from "@/presentation/ambient-background";
import { BreatheApp } from "@/presentation/breathe-app";

describe("AmbientBackground", () => {
  it("renders three decorative blobs", () => {
    const { container } = render(<AmbientBackground />);
    const ambient = container.querySelector(".ambient");
    expect(ambient).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".blob")).toHaveLength(3);
  });
});

describe("BreatheApp", () => {
  it("renders the bilingual wordmark, announcer, and decorative SVG", () => {
    render(<BreatheApp />);

    expect(screen.getByText("Breathe")).toBeInTheDocument();
    expect(screen.getByText("تنفّس")).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByRole("region", { name: "Breathing exercise controls" }),
    ).toBeInTheDocument();
  });

  it("moves focus to Pause on start and Start/Resume on pause", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Pause" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toHaveFocus();
  });

  it("toggles with Space and resets with R when focus is not on a control", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    await user.keyboard("r");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("updates the live announcer when a session starts", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("status")).toHaveTextContent("INHALE. 4 seconds.");
  });
});
