import { test, expect } from "@playwright/test";
import {
  mockBreathingApi,
  type StoredSettings,
} from "./support/mock-breathing-api";

const DEFAULT_PREFERENCES: StoredSettings = {
  durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
  goal: null,
  ramp: null,
};

test.describe("preset picker", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await mockBreathingApi(page, DEFAULT_PREFERENCES);
  });

  test("allows selecting a protocol, updates durations, auto-sets goal, and updates cycle stat", async ({
    page,
  }) => {
    await page.goto("/");

    // Trigger shows active protocol name on fresh load
    const trigger = page.getByRole("button", { name: "Resonance Coherence" });
    await expect(trigger).toBeVisible();

    const presetFields = page.locator(".preset-fields");
    await expect(presetFields).toBeHidden();

    // Opening disclosure
    await trigger.click();
    await expect(presetFields).toBeVisible();

    // Quick Escape check: closes and restores focus
    await page.keyboard.press("Escape");
    await expect(presetFields).toBeHidden();
    await expect(trigger).toBeFocused();

    // Reopen and pick Executive Focus card
    await trigger.click();
    await expect(presetFields).toBeVisible();

    const card = page.getByRole("button", { name: /Executive Focus/ });
    await expect(card).toBeVisible();
    await card.click();

    // Panel closes, trigger updates
    await expect(presetFields).toBeHidden();
    const updatedTrigger = page.getByRole("button", { name: "Executive Focus" });
    await expect(updatedTrigger).toBeVisible();

    // Open advanced options and verify steppers updated to 4s each
    const advButton = page.getByRole("button", { name: "Show advanced options" });
    await advButton.click();

    await expect(page.locator("#inhaleValue")).toHaveText("4s");
    await expect(page.locator("#holdValue")).toHaveText("4s");
    await expect(page.locator("#exhaleValue")).toHaveText("4s");
    await expect(page.locator("#restValue")).toHaveText("4s");

    // Goal picker displays pressed extra chip for 12 cycles
    const goalChip = page.getByRole("button", { name: "12 cycles" });
    await expect(goalChip).toBeVisible();
    await expect(goalChip).toHaveAttribute("aria-pressed", "true");

    // Cycle stat reads 0 / 12
    const cycleValue = page
      .locator(".mv-stat")
      .filter({ hasText: "Cycle" })
      .locator(".mv-stat-value");
    await expect(cycleValue).toHaveText("0 / 12");
  });
});
