import { describe, expect, it } from "vitest";

/**
 * Guardrail: domain modules must stay free of outer-layer package imports.
 * Full behavioral tests arrive with Phase 2.
 */
describe("architecture boundary smoke", () => {
  it("domain entry exports an object without pulling React", async () => {
    const domain = await import("@/domain/index");
    expect(domain).toBeTypeOf("object");
    expect("react" in domain).toBe(false);
  });
});
