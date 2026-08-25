import { expect, test } from "@playwright/test";

test.describe("settings persistence", () => {
  test("restores saved durations after reload and debounce-saves changes", async ({
    page,
  }) => {
    let stored = { inhale: 5, hold: 2, exhale: 8 };
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
    await expect(page.locator("#inhaleValue")).toHaveText("5s");
    await expect(page.locator("#holdValue")).toHaveText("2s");
    await expect(page.locator("#exhaleValue")).toHaveText("8s");

    const putRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/settings") && request.method() === "PUT",
    );
    await page.getByRole("button", { name: "Increase inhale duration" }).click();
    const request = await putRequest;
    expect(request.postDataJSON()).toEqual({ inhale: 6, hold: 2, exhale: 8 });
    await expect.poll(() => puts.at(-1)).toEqual({
      inhale: 6,
      hold: 2,
      exhale: 8,
    });

    await page.reload();
    await expect(page.locator("#inhaleValue")).toHaveText("6s");
  });
});
