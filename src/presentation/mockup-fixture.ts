/**
 * PROTOTYPE (mockup restyle) — deterministic in-memory persistence for the
 * `?variant=mockup&fixture=1` route. The production screen wires
 * `createHttpBreathingPersistence()`, which restores saved settings over the
 * network and makes screenshots non-deterministic between iterations. This stub
 * returns fixed, known settings, never touches the network, and drops every
 * write — so a captured frame depends only on the CSS/markup under test.
 *
 * Throwaway: delete this file, its import in
 * src/app/mockup-variant-controller.tsx, and the `mockup-variant` plumbing once
 * the redesign is folded into the real code.
 */

import type { BreathingPersistence } from "./persistence";

/** Fixed capture state: the default Current Calm preset, no session goal. */
export const MOCKUP_FIXTURE_PREFERENCES = {
  durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
  goal: null,
} as const;

export function createMockupFixturePersistence(): BreathingPersistence {
  return {
    async initialize() {
      return {
        durations: { ...MOCKUP_FIXTURE_PREFERENCES.durations },
        goal: MOCKUP_FIXTURE_PREFERENCES.goal,
      };
    },
    async saveSettings() {
      // Deterministic fixture — writes are intentionally dropped.
    },
    async saveSession() {
      // Deterministic fixture — writes are intentionally dropped.
    },
  };
}
