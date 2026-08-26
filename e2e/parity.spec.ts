import { test, expect, type Page } from "@playwright/test";

async function expectSquareGeometry(page: Page) {
  const svg = page.locator("svg.square-svg");
  await expect(svg).toHaveAttribute("viewBox", "0 0 400 400");
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".square-base")).toHaveAttribute(
    "d",
    "M40,360 L40,40 L360,40 L360,360 Z",
  );
  await expect(page.locator("#side-inhale")).toHaveAttribute(
    "d",
    "M40,360 L40,40",
  );
  await expect(page.locator("#side-hold")).toHaveAttribute("d", "M40,40 L360,40");
  await expect(page.locator("#side-exhale")).toHaveAttribute(
    "d",
    "M360,40 L360,360",
  );
  await expect(page.locator("#side-rest")).toHaveAttribute(
    "d",
    "M360,360 L40,360",
  );
  const dot = page.locator("#progressDot");
  await expect(dot).toHaveAttribute("r", "7");
  expect(Number(await dot.getAttribute("cx"))).toBe(40);
  expect(Number(await dot.getAttribute("cy"))).toBe(360);
}

async function expectSquareAboveControls(page: Page) {
  const square = page.locator(".square-wrap");
  const controls = page.locator("#controls");
  const squareBox = await square.boundingBox();
  const controlsBox = await controls.boundingBox();
  expect(squareBox, "square wrap should be measurable").toBeTruthy();
  expect(controlsBox, "controls should be measurable").toBeTruthy();
  expect(squareBox!.y + squareBox!.height).toBeLessThan(controlsBox!.y);
}

test.describe("parity — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("renders square geometry, labels, and idle state", async ({ page }) => {
    await page.goto("/");
    await expectSquareGeometry(page);
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);
    await expect(page.getByText("INHALE", { exact: true })).toBeVisible();
    await expect(page.getByText("شهيق")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
    await expect(page.getByText("Cycle")).toBeVisible();
    await expect(page.getByText("Elapsed")).toBeVisible();
    await expect(page.getByText("00:00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Use 4-4-6-2" })).toBeVisible();
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();
    await expect(page.getByRole("button", { name: "Durations" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.getByRole("switch", { name: "Sound" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByText(/history/i)).toHaveCount(0);
    await expectSquareAboveControls(page);
  });

  test("starts, pauses, resumes, and resets from transport controls", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("svg.square-svg")).not.toHaveClass(/idle/);
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);
    await expect(page.getByText("00:00")).toBeVisible();
  });

  test("applies the 4-4-6-2 preset from the durations panel", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Increase rest duration").click();
    await expect(page.locator("#restValue")).toHaveText("3s");
    await page.getByRole("button", { name: "Use 4-4-6-2" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("4s");
    await expect(page.locator("#holdValue")).toHaveText("4s");
    await expect(page.locator("#exhaleValue")).toHaveText("6s");
    await expect(page.locator("#restValue")).toHaveText("2s");
  });

  test("advances through inhale, hold, exhale, and rest", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);
    await expect(page.locator("#side-hold")).toHaveClass(/active/, {
      timeout: 6_000,
    });
    await expect(page.locator("#side-exhale")).toHaveClass(/active/, {
      timeout: 6_000,
    });
    await expect(page.locator("#side-rest")).toHaveClass(/active/, {
      timeout: 8_000,
    });
    await expect(page.getByText("REST", { exact: true })).toBeVisible();
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
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);
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
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);
  });
});

test.describe("parity — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the exercise usable under 480px without overlap", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByLabel("Decrease inhale duration")).toBeVisible();
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();
    await expectSquareGeometry(page);
    await expectSquareAboveControls(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});

test.describe("parity — short viewport 600", () => {
  test.use({ viewport: { width: 1024, height: 600 } });

  test("collapses durations and keeps the square above controls", async ({
    page,
  }) => {
    await page.goto("/");
    const disclosure = page.getByRole("button", { name: "Durations" });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("Decrease inhale duration")).toBeHidden();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    await expectSquareAboveControls(page);
  });
});

test.describe("parity — short viewport 472", () => {
  test.use({ viewport: { width: 1024, height: 472 } });

  test("does not overlap the square and control deck at 1024×472", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Durations" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    await expectSquareGeometry(page);
    await expectSquareAboveControls(page);
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
