import { describe, expect, it } from "vitest";

/**
 * Smoke test proving the unit runner starts and path aliases resolve.
 * Domain logic arrives in Phase 2.
 */
describe("foundation", () => {
  it("resolves the @ alias into src", async () => {
    const domain = await import("@/domain");
    expect(domain).toBeTypeOf("object");
  });
});
