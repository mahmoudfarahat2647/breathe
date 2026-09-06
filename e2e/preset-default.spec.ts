import { test, expect } from "@playwright/test";

test.describe("parity - default preset fallback renders Resonance Coherence Triangle", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("when settings api is unmocked, app uses compiled-in default preset and idle stage renders Resonance Coherence in triangle mode", async ({
    page,
  }) => {
    // No mock installed: /api/settings will return 401 / fail, falling back to compiled-in default preset
    await page.goto("/");

    // The Triangle stage renders .square-base and no .square-frame-border
    await expect(page.locator(".square-base")).toBeAttached();
    await expect(page.locator(".square-frame-border")).toHaveCount(0);

    // In Triangle mode only 3 side paths exist: inhale, hold, exhale (#side-rest is absent)
    await expect(page.locator("#side-inhale")).toBeAttached();
    await expect(page.locator("#side-hold")).toBeAttached();
    await expect(page.locator("#side-exhale")).toBeAttached();
    await expect(page.locator("#side-rest")).toHaveCount(0);

    // Edges: rest edge is filtered out in triangle mode
    await expect(page.locator(".mv-edge-inhale")).toHaveText("Inhale");
    await expect(page.locator(".mv-edge-hold")).toHaveText("Hold");
    await expect(page.locator(".mv-edge-exhale")).toHaveText("Exhale");
    await expect(page.locator(".mv-edge-rest")).toHaveCount(0);

    // Steppers: open advanced options and verify inhale/exhale values
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("5.5s");
    await expect(page.locator("#exhaleValue")).toHaveText("5.5s");
    await expect(page.locator("#holdValue")).toHaveText("0s");
    await expect(page.locator("#restValue")).toHaveText("0s");
  });
});
