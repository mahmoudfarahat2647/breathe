import type { Page } from "@playwright/test";

/** Ramp picker chip labels, in DOM order — must stay byte-identical to the
 *  literal previously inlined in parity.spec.ts. */
export const RAMP_LABELS = ["Wind down", "Slow down", "Off"] as const;
export type RampLabel = (typeof RAMP_LABELS)[number];

/** Accessible name of the `role="group"` wrapping the Ramp chips. */
export const RAMP_GROUP_NAME = "Ramp";

/** Fixed anonymous user id the auth stub hands back. */
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

/** Shape of the `/api/settings` wire body the specs round-trip. Defined here,
 *  not imported from `@/…` — the e2e layer treats the HTTP body as a black box
 *  and the specs already declared this inline. */
export type StoredSettings = {
  durations: { inhale: number; hold: number; exhale: number; rest: number };
  goal: string | null;
  ramp: string | null;
};

export type BreathingApiMock = {
  /** Latest settings state the mock holds (updated on every settings PUT). */
  readonly stored: StoredSettings;
  /** Every settings PUT body, in order. */
  readonly puts: StoredSettings[];
};

/**
 * Install the four breathing-API route stubs on `page`, seeded from
 * `initialStored`. The mock owns the current settings state: each settings PUT
 * replaces it with `route.request().postDataJSON()`, appends that to `puts`, and
 * fulfils with the new state; settings GET returns the current state. Returns a
 * live view so callers always observe the latest state and can keep their
 * existing PUT assertions.
 */
export async function mockBreathingApi(
  page: Page,
  initialStored: StoredSettings,
): Promise<BreathingApiMock> {
  let stored: StoredSettings = initialStored;
  const puts: StoredSettings[] = [];

  await page.route("**/api/auth/anonymous", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ userId: TEST_USER_ID }),
    });
  });

  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "PUT") {
      stored = route.request().postDataJSON() as StoredSettings;
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

  await page.route("**/api/sessions/history", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  return {
    get stored() {
      return stored;
    },
    puts,
  };
}
