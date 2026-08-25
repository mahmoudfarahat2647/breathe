import { describe, expect, it } from "vitest";

import {
  PHASE_DURATION_LIMITS,
  PHASE_LABELS,
  PHASES,
  isPhase,
  nextPhase,
  phaseIndex,
} from "@/domain";

describe("Phase", () => {
  it("orders phases inhale → hold → exhale", () => {
    expect(PHASES).toEqual(["inhale", "hold", "exhale"]);
  });

  it("matches reference duration limits", () => {
    expect(PHASE_DURATION_LIMITS.inhale).toEqual({ min: 2, max: 15 });
    expect(PHASE_DURATION_LIMITS.hold).toEqual({ min: 1, max: 15 });
    expect(PHASE_DURATION_LIMITS.exhale).toEqual({ min: 2, max: 15 });
  });

  it("exposes bilingual labels from the reference", () => {
    expect(PHASE_LABELS.inhale).toEqual({ en: "INHALE", ar: "شهيق" });
    expect(PHASE_LABELS.hold).toEqual({ en: "HOLD", ar: "حبس" });
    expect(PHASE_LABELS.exhale).toEqual({ en: "EXHALE", ar: "زفير" });
  });

  it("accepts only the three phase names", () => {
    expect(isPhase("inhale")).toBe(true);
    expect(isPhase("hold")).toBe(true);
    expect(isPhase("exhale")).toBe(true);
    expect(isPhase("pause")).toBe(false);
    expect(isPhase("")).toBe(false);
  });

  it("wraps to inhale after exhale", () => {
    expect(nextPhase("inhale")).toBe("hold");
    expect(nextPhase("hold")).toBe("exhale");
    expect(nextPhase("exhale")).toBe("inhale");
  });

  it("indexes phases in triangle order", () => {
    expect(phaseIndex("inhale")).toBe(0);
    expect(phaseIndex("hold")).toBe(1);
    expect(phaseIndex("exhale")).toBe(2);
  });
});
