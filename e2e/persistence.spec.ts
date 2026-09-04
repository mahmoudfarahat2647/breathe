import { expect, test } from "@playwright/test";
import { mockBreathingApi } from "./support/mock-breathing-api";

test.describe("settings persistence", () => {
  test("restores saved durations after reload and debounce-saves changes", async ({
    page,
  }) => {
    const { puts } = await mockBreathingApi(page, {
      durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
      goal: null,
      ramp: null,
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("5s");
    await expect(page.locator("#holdValue")).toHaveText("2s");
    await expect(page.locator("#exhaleValue")).toHaveText("8s");
    await expect(page.locator("#restValue")).toHaveText("3s");

    const putRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/settings") && request.method() === "PUT",
    );
    await page.getByRole("button", { name: "Increase inhale duration" }).click();
    const request = await putRequest;
    expect(request.postDataJSON()).toEqual({
      durations: { inhale: 6, hold: 2, exhale: 8, rest: 3 },
      goal: null,
      ramp: null,
    });
    await expect.poll(() => puts.at(-1)).toEqual({
      durations: { inhale: 6, hold: 2, exhale: 8, rest: 3 },
      goal: null,
      ramp: null,
    });

    await page.reload();
    await expect(page.locator("#inhaleValue")).toHaveText("6s");
  });

  test("persists selected ramp across reloads", async ({ page }) => {
    const { puts } = await mockBreathingApi(page, {
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: null,
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.getByRole("button", { name: "Slow down" })).toBeVisible();

    const putRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/settings") && request.method() === "PUT",
    );
    await page.getByRole("button", { name: "Wind down" }).click();
    const request = await putRequest;
    expect(request.postDataJSON()).toMatchObject({
      ramp: "wind-down",
    });
    await expect.poll(() => puts.at(-1)?.ramp).toBe("wind-down");

    await page.reload();
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.getByRole("button", { name: "Wind down" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const putSlowDownRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/settings") && request.method() === "PUT",
    );
    await page.getByRole("button", { name: "Slow down" }).click();
    const slowDownRequest = await putSlowDownRequest;
    expect(slowDownRequest.postDataJSON()).toMatchObject({
      ramp: "slow-down",
    });
    await expect.poll(() => puts.at(-1)?.ramp).toBe("slow-down");

    await page.reload();
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.getByRole("button", { name: "Slow down" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
