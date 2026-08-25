import { describe, expect, it } from "vitest";

/**
 * Guardrail: domain and application modules must stay free of outer-layer packages.
 * ESLint `no-restricted-imports` and `boundaries/dependencies` enforce this at lint time.
 */
describe("architecture boundary", () => {
  it("domain entry exports an object without pulling React", async () => {
    const domain = await import("@/domain/index");
    expect(domain).toBeTypeOf("object");
    expect("react" in domain).toBe(false);
  });

  it("application use cases load without pulling React or Next.js", async () => {
    const application = await import("@/application/index");
    expect(application).toBeTypeOf("object");
    expect("react" in application).toBe(false);
    expect("next" in application).toBe(false);
    expect(typeof application.GetSettings).toBe("function");
    expect(typeof application.SaveSettings).toBe("function");
    expect(typeof application.SaveSession).toBe("function");
  });
});
