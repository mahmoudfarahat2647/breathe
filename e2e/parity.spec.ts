import { test, expect, type Page } from "@playwright/test";

async function expectSquareGeometry(page: Page) {
  const svg = page.locator("svg.square-svg");
  await expect(svg).toHaveAttribute("viewBox", "0 0 400 400");
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".square-frame-border")).toBeVisible();
  for (const phase of ["inhale", "hold", "exhale", "rest"] as const) {
    const side = page.locator(`#side-${phase}`);
    await expect(side).toHaveAttribute("pathLength", "1");
    const d = await side.getAttribute("d");
    expect(d).toBeTruthy();
  }
  const dot = page.locator("#progressDot");
  await expect(dot).toBeAttached();
}

async function expectSquareAboveControls(page: Page) {
  const square = page.locator(".mv-square");
  const controls = page.locator("#controls");
  const squareBox = await square.boundingBox();
  const controlsBox = await controls.boundingBox();
  expect(squareBox, "square should be measurable").toBeTruthy();
  expect(controlsBox, "controls should be measurable").toBeTruthy();

  const exhale = page.locator(".mv-edge-exhale");
  const exhaleBox = await exhale.boundingBox();
  const squareBottom = exhaleBox
    ? Math.max(squareBox!.y + squareBox!.height, exhaleBox.y + exhaleBox.height)
    : squareBox!.y + squareBox!.height;

  expect(squareBottom).toBeLessThan(controlsBox!.y);
}

test.describe("parity — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("renders square geometry, labels, and idle state", async ({ page }) => {
    await page.goto("/");
    await expectSquareGeometry(page);
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);

    await expect(page.locator(".mv-edge-inhale")).toHaveText("Inhale");
    await expect(page.locator(".mv-edge-hold")).toHaveText("Hold");
    await expect(page.locator(".mv-edge-exhale")).toHaveText("Exhale");
    await expect(page.locator(".mv-edge-rest")).toHaveText("Rest");
    await expect(page.locator(".mv-coach")).toHaveText("Breathe in slowly");

    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
    await expect(page.getByText("Cycle", { exact: true })).toBeVisible();
    await expect(page.getByText("Elapsed")).toBeVisible();
    await expect(page.getByText("00:00")).toBeVisible();

    await expect(page.getByRole("radiogroup")).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);

    const disclosure = page.getByRole("button", { name: "Show advanced options" });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();

    const soundSwitch = page.getByRole("switch", { name: "Sound" });
    await expect(soundSwitch).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Off")).toBeVisible();

    await expect(page.getByRole("button", { name: "History" })).toBeVisible();
    await expectSquareAboveControls(page);

    await disclosure.click();
    await expectSquareAboveControls(page);
  });

  test("renders side bands and preserves stage width >= 280px at 1280×800", async ({
    page,
  }) => {
    await page.goto("/");
    const square = page.locator(".mv-square");
    const squareBox = await square.boundingBox();
    expect(squareBox).toBeTruthy();
    expect(squareBox!.width).toBeGreaterThanOrEqual(280);

    const paddingInline = await page.locator(".breathe-root").evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    });
    expect(paddingInline).toBeGreaterThan(0);
  });

  test("starts, pauses, resumes, and resets from transport controls", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("svg.square-svg")).not.toHaveClass(/idle/);
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
    await expect(page.locator("svg.square-svg")).toHaveClass(/idle/);
    await expect(page.getByText("00:00")).toBeVisible();
  });

  test("adjusts phase durations in advanced options", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await page.getByLabel("Increase rest duration").click();
    await expect(page.locator("#restValue")).toHaveText("3s");
    await page.getByLabel("Decrease rest duration").click();
    await expect(page.locator("#restValue")).toHaveText("2s");
  });

  test("advances through inhale, hold, exhale, and rest", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");
    await page.getByRole("button", { name: "Show advanced options" }).click();
    for (const phase of ["inhale", "hold", "exhale", "rest"] as const) {
      const decrease = page.getByLabel(`Decrease ${phase} duration`);
      for (let i = 0; i < 6; i += 1) {
        await decrease.click();
      }
    }
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);
    await expect(page.locator("#side-hold")).toHaveClass(/active/, {
      timeout: 8_000,
    });
    await expect(page.locator("#side-exhale")).toHaveClass(/active/, {
      timeout: 8_000,
    });
    await expect(page.locator("#side-rest")).toHaveClass(/active/, {
      timeout: 8_000,
    });
    await expect(page.locator(".mv-edge-rest")).toHaveAttribute("data-active", "true");
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
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const resetBtn = page.getByRole("button", { name: "Reset", exact: true });
    await resetBtn.focus();
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

  test("opens history overlay, keeps controls reachable, and closes with Escape", async ({
    page,
  }) => {
    await page.goto("/");
    const historyBtn = page.getByRole("button", { name: "History" });
    await historyBtn.click();
    const historyFields = page.locator(".history-fields");
    await expect(historyFields).toBeVisible();

    const overflowY = await historyFields.evaluate((el) => getComputedStyle(el).overflowY);
    expect(["auto", "scroll"]).toContain(overflowY);

    const controls = page.locator("#controls");
    const controlsBox = await controls.boundingBox();
    expect(controlsBox).toBeTruthy();
    const viewport = page.viewportSize();
    expect(controlsBox!.y).toBeLessThan(viewport!.height);

    await page.keyboard.press("Escape");
    await expect(historyFields).toBeHidden();
    await expect(historyBtn).toBeFocused();
  });
});

test.describe("parity — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the exercise usable under 480px without overlap", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expectSquareGeometry(page);
    await expectSquareAboveControls(page);

    const disclosure = page.getByRole("button", { name: "Show advanced options" });
    await disclosure.click();
    await expect(page.getByLabel("Decrease inhale duration")).toBeVisible();
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();
    await expectSquareAboveControls(page);

    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});

test.describe("parity — short viewport 600", () => {
  test.use({ viewport: { width: 1024, height: 600 } });

  test("collapses durations, keeps square above controls, and has no side bands", async ({
    page,
  }) => {
    await page.goto("/");

    const paddingInline = await page.locator(".breathe-root").evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    });
    expect(paddingInline).toBe(0);

    const disclosure = page.getByRole("button", { name: "Show advanced options" });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("Decrease inhale duration")).toBeHidden();
    await expectSquareAboveControls(page);

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
    const disclosure = page.getByRole("button", { name: "Show advanced options" });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    await expectSquareGeometry(page);
    await expectSquareAboveControls(page);

    await disclosure.click();
    await expect(page.getByLabel("Decrease rest duration")).toBeVisible();
    await expectSquareAboveControls(page);
  });
});

test.describe("parity — reduced motion", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test("disables progress dot and neutralizes transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const dotDisplay = await page.locator("#progressDot").evaluate((el) => {
      return getComputedStyle(el).display;
    });
    expect(dotDisplay).toBe("none");

    const sideTransition = await page.locator(".square-side").first().evaluate((el) => {
      return getComputedStyle(el).transitionDuration;
    });
    expect(sideTransition === "0s" || sideTransition === "" || parseFloat(sideTransition) === 0).toBeTruthy();

    const edgeTransition = await page.locator(".mv-edge").first().evaluate((el) => {
      return getComputedStyle(el).transitionDuration;
    });
    expect(edgeTransition === "0s" || edgeTransition === "" || parseFloat(edgeTransition) === 0).toBeTruthy();
  });
});
