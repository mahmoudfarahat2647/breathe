import { test, expect } from "@playwright/test";

test.describe("foundation smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Breathe" })).toBeVisible();
  });
});
