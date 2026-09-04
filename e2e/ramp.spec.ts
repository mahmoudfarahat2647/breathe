import { expect, test, type Page } from "@playwright/test";
import {
  mockBreathingApi,
  RAMP_GROUP_NAME,
  type RampLabel,
} from "./support/mock-breathing-api";

function cycleValueLocator(page: Page) {
  return page
    .locator(".mv-stat")
    .filter({ has: page.locator(".mv-stat-label", { hasText: "Cycle" }) })
    .locator(".mv-stat-value");
}

function rampButton(page: Page, label: RampLabel) {
  return page
    .getByRole("group", { name: RAMP_GROUP_NAME })
    .getByRole("button", { name: label, exact: true });
}

/**
 * Wait until the running engine has reached `displayedCycle` (the UI shows
 * `engine.cycleCount + 1` while running) and is in `phase`, then assert the
 * countdown at phase entry — checked here, one microtask after the side goes
 * active, so it is still the ramped starting value and cannot have ticked down.
 */
async function waitForRampedPhaseEntry(
  page: Page,
  displayedCycle: number,
  phase: "inhale" | "exhale",
  expectedCountdown: string,
) {
  await expect(cycleValueLocator(page)).toHaveText(String(displayedCycle), {
    timeout: 45_000,
  });
  await expect(page.locator(`#side-${phase}`)).toHaveClass(/active/, {
    timeout: 15_000,
  });
  await expect(page.locator(".mv-count")).toHaveText(expectedCountdown, {
    timeout: 2_000,
  });
}

async function setPhaseDurationToMin(page: Page, phase: string, target: string) {
  const decrease = page.getByLabel(`Decrease ${phase} duration`);
  const value = page.locator(`#${phase}Value`);
  for (let i = 0; i < 12 && (await value.textContent()) !== target; i += 1) {
    await decrease.click();
  }
  await expect(value).toHaveText(target);
}

async function setupRampTest(page: Page) {
  await mockBreathingApi(page, {
    durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    goal: null,
    ramp: null,
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Show advanced options" }).click();

  // 2 / 1 / 2 / 1 — the shortest cycle the manual steppers allow, so real-time
  // cycle-walking in this spec stays under ~20s.
  await setPhaseDurationToMin(page, "inhale", "2s");
  await setPhaseDurationToMin(page, "hold", "1s");
  await setPhaseDurationToMin(page, "exhale", "2s");
  await setPhaseDurationToMin(page, "rest", "1s");
}

test.describe("ramp progression", () => {
  test("Wind Down lengthens the exhale from the third cycle", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await setupRampTest(page);

    await rampButton(page, "Wind down").click();
    await expect(rampButton(page, "Wind down")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Start", exact: true }).click();

    // Wind Down adds 1s to exhale every 2 completed cycles, so the first ramped
    // exhale is on engine cycle 2 — the cycle the UI labels "Cycle 3".
    await waitForRampedPhaseEntry(page, 3, "exhale", "3");

    // Phase-stable signals: both encode the ramped 3s duration for the whole phase.
    await expect(page.locator(".mv-ramp-hint")).toHaveText("Exhale now 3s");
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
    ).toHaveText("EXHALE. 3 seconds.");

    // The hint is a plain swap with no transition (reduced-motion re-check: it
    // has no `transition` rule in any mode, so it can never animate in).
    const hintTransition = await page
      .locator(".mv-ramp-hint")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(["0s", ""]).toContain(hintTransition);
  });

  test("Slow Down lengthens the inhale from the fourth cycle", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await setupRampTest(page);

    await rampButton(page, "Slow down").click();
    await expect(rampButton(page, "Slow down")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Start", exact: true }).click();

    // Slow Down adds 1s to inhale and exhale every 3 completed cycles, so the
    // first ramped inhale is on engine cycle 3 — the cycle the UI labels "Cycle 4".
    await waitForRampedPhaseEntry(page, 4, "inhale", "3");

    await expect(page.locator(".mv-ramp-hint")).toHaveText("Inhale now 3s");
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
    ).toHaveText("INHALE. 3 seconds.");
  });
});
