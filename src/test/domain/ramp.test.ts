import { describe, expect, it } from "vitest";

import {
  DomainValidationError,
  RAMP_CATALOG,
  rampFromDto,
  rampToDto,
  settingsForCycle,
} from "@/domain";
import { BreathingSettings } from "@/domain/breathing-settings";

describe("rampFromDto", () => {
  it("treats null and undefined as Off", () => {
    expect(rampFromDto(null)).toBeNull();
    expect(rampFromDto(undefined)).toBeNull();
    expect(rampToDto(null)).toBeNull();
  });

  it("accepts the wind-down id and round-trips it", () => {
    expect(rampFromDto("wind-down")).toBe("wind-down");
    expect(rampToDto("wind-down")).toBe("wind-down");
  });

  it("accepts the slow-down id and round-trips it", () => {
    expect(rampFromDto("slow-down")).toBe("slow-down");
    expect(rampToDto("slow-down")).toBe("slow-down");
  });

  it("rejects unknown values", () => {
    expect(() => rampFromDto("taper")).toThrow(DomainValidationError);
    expect(() => rampFromDto(42)).toThrow(DomainValidationError);
    expect(() => rampFromDto({})).toThrow(DomainValidationError);
  });
});

describe("RAMP_CATALOG", () => {
  it("describes Wind Down as an exhale ramp, every 2 cycles, cap +4", () => {
    const rule = RAMP_CATALOG["wind-down"];
    expect(rule.id).toBe("wind-down");
    expect(rule.name).toBe("Wind down");
    expect(rule.phases).toEqual(["exhale"]);
    expect(rule.every).toBe(2);
    expect(rule.cap).toBe(4);
    expect(rule.description).toMatch(/exhale/i);
  });

  it("describes Slow Down as an inhale and exhale ramp, every 3 cycles, cap +3", () => {
    const rule = RAMP_CATALOG["slow-down"];
    expect(rule.id).toBe("slow-down");
    expect(rule.name).toBe("Slow down");
    expect(rule.phases).toEqual(["inhale", "exhale"]);
    expect(rule.every).toBe(3);
    expect(rule.cap).toBe(3);
    expect(rule.description).toMatch(/inhale/i);
    expect(rule.description).toMatch(/exhale/i);
  });
});

describe("settingsForCycle", () => {
  const base = BreathingSettings.fromDto({
    inhale: 4,
    hold: 4,
    exhale: 6,
    rest: 2,
  });

  it("returns the base settings unchanged when the Ramp is Off", () => {
    expect(settingsForCycle(base, null, 0)).toBe(base);
    expect(settingsForCycle(base, null, 99)).toBe(base);
  });

  it("steps Wind Down's exhale by 1s every 2 completed cycles, capped at +4", () => {
    const exhaleByCycle = Array.from({ length: 9 }, (_, cycle) =>
      settingsForCycle(base, "wind-down", cycle).exhale,
    );
    expect(exhaleByCycle).toEqual([6, 6, 7, 7, 8, 8, 9, 9, 10]);
  });

  it("steps Slow Down's inhale and exhale by 1s every 3 completed cycles, capped at +3", () => {
    const inhaleByCycle = Array.from({ length: 10 }, (_, cycle) =>
      settingsForCycle(base, "slow-down", cycle).inhale,
    );
    const exhaleByCycle = Array.from({ length: 10 }, (_, cycle) =>
      settingsForCycle(base, "slow-down", cycle).exhale,
    );
    expect(inhaleByCycle).toEqual([4, 4, 4, 5, 5, 5, 6, 6, 6, 7]);
    expect(exhaleByCycle).toEqual([6, 6, 6, 7, 7, 7, 8, 8, 8, 9]);
  });

  it("never lets a ramped phase exceed the 15s maximum", () => {
    const highBase = BreathingSettings.fromDto({
      inhale: 4,
      hold: 4,
      exhale: 13,
      rest: 2,
    });
    expect(settingsForCycle(highBase, "wind-down", 4).exhale).toBe(15);
    expect(settingsForCycle(highBase, "wind-down", 8).exhale).toBe(15);
  });

  it("never lets Slow Down's ramped phases exceed the 15s maximum", () => {
    const highBase = BreathingSettings.fromDto({
      inhale: 14,
      hold: 4,
      exhale: 13,
      rest: 2,
    });
    const at9 = settingsForCycle(highBase, "slow-down", 9);
    expect(at9.inhale).toBe(15);
    expect(at9.exhale).toBe(15);
  });

  it("never touches hold or rest", () => {
    const ramped = settingsForCycle(base, "wind-down", 8);
    expect(ramped.hold).toBe(base.hold);
    expect(ramped.rest).toBe(base.rest);
    expect(ramped.inhale).toBe(base.inhale);
  });

  it("never touches hold or rest under Slow Down", () => {
    const ramped = settingsForCycle(base, "slow-down", 8);
    expect(ramped.hold).toBe(base.hold);
    expect(ramped.rest).toBe(base.rest);
  });
});
