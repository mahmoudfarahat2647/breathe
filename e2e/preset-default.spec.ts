import { test, expect } from "@playwright/test";

test.describe("parity - default preset fallback renders Resonance Coherence", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("when the settings api is unmocked, the app uses its compiled-in default preset and the idle Square stage shows Resonance Coherence durations", async ({
    page,
  }) => {
    // No mock installed: /api/settings fails, so the app falls back to its
    // compiled-in default preset (Resonance Coherence, 5.5/0/5.5/0).
    await page.goto("/");

    // The Stage always renders the Square — it is the only shape. A zero-rest
    // preset still draws all four rounded-perimeter segments; the rest side is
    // simply shown as instantly complete.
    await expect(page.locator(".square-frame-border")).toBeAttached();
    await expect(page.locator(".square-base")).toHaveCount(0);

    for (const phase of ["inhale", "hold", "exhale", "rest"] as const) {
      await expect(page.locator(`#side-${phase}`)).toHaveAttribute(
        "pathLength",
        "1",
      );
    }

    await expect(page.locator(".mv-edge-inhale")).toHaveText("Inhale");
    await expect(page.locator(".mv-edge-hold")).toHaveText("Hold");
    await expect(page.locator(".mv-edge-exhale")).toHaveText("Exhale");
    await expect(page.locator(".mv-edge-rest")).toHaveText("Rest");

    // Steppers: open advanced options and verify the compiled-in default values.
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("5.5s");
    await expect(page.locator("#exhaleValue")).toHaveText("5.5s");
    await expect(page.locator("#holdValue")).toHaveText("0s");
    await expect(page.locator("#restValue")).toHaveText("0s");
  });
});
