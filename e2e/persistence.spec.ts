import { expect, test } from "@playwright/test";

test.describe("settings persistence", () => {
  test("restores saved durations after reload and debounce-saves changes", async ({
    page,
  }) => {
    let stored = {
      durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
      goal: null,
      ramp: null,
    };
    const puts: typeof stored[] = [];

    await page.route("**/api/auth/anonymous", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "11111111-1111-4111-8111-111111111111",
        }),
      });
    });

    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "PUT") {
        stored = route.request().postDataJSON() as typeof stored;
        puts.push(stored);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(stored),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stored),
      });
    });

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ outcome: "saved" }),
      });
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
    let stored = {
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
      ramp: null as string | null,
    };
    const puts: typeof stored[] = [];

    await page.route("**/api/auth/anonymous", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "11111111-1111-4111-8111-111111111111",
        }),
      });
    });

    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "PUT") {
        stored = route.request().postDataJSON() as typeof stored;
        puts.push(stored);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(stored),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stored),
      });
    });

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ outcome: "saved" }),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();

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
  });
});
