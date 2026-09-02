import { test, expect } from "@playwright/test";

async function mockDeterministicBackend(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/anonymous", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ userId: "11111111-1111-4111-8111-111111111111" }),
    });
  });

  await page.route("**/api/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
      }),
    });
  });

  await page.route("**/api/sessions/history*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary: {
          totalSessions: 3,
          totalElapsedSeconds: 360,
          currentStreak: 2,
          sessionsThisWeek: 3,
        },
        records: [
          {
            id: "1",
            createdAtEpochMs: 1725200000000,
            calendarDay: { year: 2026, month: 9, day: 2 },
            cycleCount: 4,
            elapsedSeconds: 120,
          },
        ],
      }),
    });
  });
}

test.describe("visual regression baselines", () => {
  test("1. idle default, 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockDeterministicBackend(page);
    await page.goto("/");
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);

    await expect(page).toHaveScreenshot("idle-default-1280x800.png", {
      mask: [page.locator(".mv-count"), page.locator("#progressDot")],
    });
  });

  test("2. idle default, 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockDeterministicBackend(page);
    await page.goto("/");
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);

    await expect(page).toHaveScreenshot("idle-default-390x844.png", {
      mask: [page.locator(".mv-count"), page.locator("#progressDot")],
    });
  });

  test("3. advanced options open, 1024x472", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 472 });
    await mockDeterministicBackend(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();

    await expect(page).toHaveScreenshot("advanced-options-open-1024x472.png", {
      mask: [page.locator(".mv-count"), page.locator("#progressDot")],
    });
  });

  test("4. History panel open, 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockDeterministicBackend(page);
    await page.goto("/");
    await page.getByRole("button", { name: "History" }).click();
    await expect(page.locator(".history-fields")).toBeVisible();

    await expect(page).toHaveScreenshot("history-panel-open-390x844.png", {
      mask: [page.locator(".mv-count"), page.locator("#progressDot")],
    });
  });
});
