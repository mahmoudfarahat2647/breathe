import { test, expect, type Page } from "@playwright/test";

async function expectTriangleGeometry(page: Page) {
  const svg = page.locator("svg.triangle-svg");
  await expect(svg).toHaveAttribute("viewBox", "0 0 400 366");
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".triangle-base")).toHaveAttribute(
    "d",
    "M200,39 L365,325 L35,325 Z",
  );
  await expect(page.locator("#side-inhale")).toHaveAttribute(
    "d",
    "M35,325 L200,39",
  );
  await expect(page.locator("#side-hold")).toHaveAttribute(
    "d",
    "M200,39 L365,325",
  );
  await expect(page.locator("#side-exhale")).toHaveAttribute(
    "d",
    "M365,325 L35,325",
  );
  const dot = page.locator("#progressDot");
  await expect(dot).toHaveAttribute("r", "7");
  expect(Number(await dot.getAttribute("cx"))).toBe(35);
  expect(Number(await dot.getAttribute("cy"))).toBe(325);
}

test.describe("parity — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("renders reference controls, labels, and idle triangle", async ({
    page,
  }) => {
    await page.goto("/");
    await expectTriangleGeometry(page);
    await expect(page.locator("svg.triangle-svg")).toHaveClass(/idle/);
    await expect(page.getByText("INHALE", { exact: true })).toBeVisible();
    await expect(page.getByText("شهيق").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
    await expect(page.getByText("Cycle")).toBeVisible();
    await expect(page.getByText("Elapsed")).toBeVisible();
    await expect(page.getByText("00:00")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset to Recommended (4-4-6)" }),
    ).toBeVisible();
    await expect(page.getByRole("switch", { name: "Sound" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByText(/history/i)).toHaveCount(0);
  });

  test("starts, pauses, resumes, and resets from transport controls", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("svg.triangle-svg")).not.toHaveClass(/idle/);
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.locator("svg.triangle-svg")).toHaveClass(/idle/);
    await expect(page.getByText("00:00")).toBeVisible();
  });

  test("Space toggles transport and R resets when focus is not on a control", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("body").click({ position: { x: 8, y: 8 } });
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.keyboard.press("r");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("does not steal Space from a focused button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Reset", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    await expect(page.locator("svg.triangle-svg")).toHaveClass(/idle/);
  });

  test("does not steal Space from the focused Sound switch", async ({
    page,
  }) => {
    await page.goto("/");
    const soundSwitch = page.getByRole("switch", { name: "Sound" });
    await expect(soundSwitch).toHaveAttribute("aria-checked", "false");
    await soundSwitch.focus();
    await page.keyboard.press("Space");
    await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("button", { name: "Start", exact: true }),
    ).toBeVisible();
    await expect(page.locator("svg.triangle-svg")).toHaveClass(/idle/);
  });
});

test.describe("parity — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the bilingual exercise usable under 480px", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByLabel("Decrease inhale duration")).toBeVisible();
    await expectTriangleGeometry(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});

test.describe("parity — short viewport", () => {
  test.use({ viewport: { width: 1024, height: 600 } });

  test("shrinks the triangle wrap at max-height 640px", async ({ page }) => {
    await page.goto("/");
    const width = await page.locator(".triangle-wrap").evaluate((el) => {
      return getComputedStyle(el).width;
    });
    expect(Number.parseFloat(width)).toBeLessThanOrEqual(480);
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });
});

test.describe("parity — reduced motion", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test("disables blob drift and phase pulse", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const animation = await page.locator(".ambient .blob.b1").evaluate((el) => {
      return getComputedStyle(el).animationName;
    });
    expect(animation === "none" || animation === "").toBeTruthy();

    await page.getByRole("button", { name: "Start", exact: true }).click();
    const pulse = await page.locator(".phase-en").evaluate((el) => {
      return getComputedStyle(el).animationName;
    });
    expect(pulse === "none" || pulse === "").toBeTruthy();
  });
});
