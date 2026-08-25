import { test, expect } from "@playwright/test";

test.describe("foundation smoke", () => {
  test("home page loads the breathe wordmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Breathe", { exact: true })).toBeVisible();
    await expect(page.getByText("تنفّس")).toBeVisible();
  });
});
