import { describe, expect, it } from "vitest";

import {
  MANUAL_STEPPER_LIMITS,
  PHASE_DURATION_LIMITS,
  PHASE_LABELS,
  PHASES,
  isPhase,
  nextPhase,
  phaseIndex,
  sideStates,
} from "@/domain";

describe("Phase", () => {
  it("orders phases inhale → hold → exhale → rest", () => {
    expect(PHASES).toEqual(["inhale", "hold", "exhale", "rest"]);
  });

  it("allows zero hold and rest in preset limits while steppers stay 1–15", () => {
    expect(PHASE_DURATION_LIMITS.inhale).toEqual({ min: 2, max: 15 });
    expect(PHASE_DURATION_LIMITS.hold).toEqual({ min: 0, max: 15 });
    expect(PHASE_DURATION_LIMITS.exhale).toEqual({ min: 2, max: 15 });
    expect(PHASE_DURATION_LIMITS.rest).toEqual({ min: 0, max: 15 });
    expect(MANUAL_STEPPER_LIMITS.hold).toEqual({ min: 1, max: 15 });
    expect(MANUAL_STEPPER_LIMITS.rest).toEqual({ min: 1, max: 15 });
  });

  it("exposes English phase labels including REST", () => {
    expect(PHASE_LABELS.inhale).toBe("INHALE");
    expect(PHASE_LABELS.hold).toBe("HOLD");
    expect(PHASE_LABELS.exhale).toBe("EXHALE");
    expect(PHASE_LABELS.rest).toBe("REST");
  });

  it("accepts only the four phase names", () => {
    expect(isPhase("inhale")).toBe(true);
    expect(isPhase("hold")).toBe(true);
    expect(isPhase("exhale")).toBe(true);
    expect(isPhase("rest")).toBe(true);
    expect(isPhase("pause")).toBe(false);
    expect(isPhase("")).toBe(false);
  });

  it("wraps to inhale after rest", () => {
    expect(nextPhase("inhale")).toBe("hold");
    expect(nextPhase("hold")).toBe("exhale");
    expect(nextPhase("exhale")).toBe("rest");
    expect(nextPhase("rest")).toBe("inhale");
  });

  it("indexes phases in square order", () => {
    expect(phaseIndex("inhale")).toBe(0);
    expect(phaseIndex("hold")).toBe(1);
    expect(phaseIndex("exhale")).toBe(2);
    expect(phaseIndex("rest")).toBe(3);
  });

  it("exposes four pending sides while idle", () => {
    expect(sideStates(0, "idle")).toEqual({
      inhale: "pending",
      hold: "pending",
      exhale: "pending",
      rest: "pending",
    });
  });
});
