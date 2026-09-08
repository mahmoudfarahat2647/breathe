# Protocol Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current five-entry preset catalog with five science-backed breathing protocols (Physiological Sigh / "Acute De-Stress", Nadi Shodhana / "Mood Elevation", Resonance Coherence, 4-7-8 "Sleep Shift", Box / "Executive Focus"), expose them through a new header Preset Picker, and support the three things the current fixed 4-phase/integer engine can't: a double-inhale top-off cue, a per-cycle nostril cue, and half-second durations.

**Architecture:** Clean Architecture, dependencies point inward (domain → application → infrastructure/presentation). New pure domain module `src/domain/technique.ts` computes top-off/nostril cues from state + preset; `BreathingSettings` grows half-step validation; `BreathingPreset` grows dosage + technique metadata; `ApplyPreset` returns the full preset DTO instead of just durations. Presentation wires a new `PresetPicker` overlay (same disclosure pattern as `HistoryPanel`) and merges the ramp hint / technique hint into one `hint` slot on the view model. Infrastructure widens the four duration columns to `numeric(3,1)` and updates the three row mappers.

**Tech Stack:** Next.js App Router, TypeScript, Vitest + Testing Library, Playwright, Supabase Postgres + pgTAP, pnpm.

**Spec:** `C:\Users\DELL\.claude\plans\scientific-technical-abstract-parasol.md` (Protocol Library — five science-backed presets). This plan implements that spec; read both together — the spec carries the full protocol rationale/dosage table and the decisions log.

## Global Constraints

- Package manager is pnpm; never use npm/yarn.
- Lint gate is `pnpm exec eslint src e2e`, **not** `pnpm lint` (stale `.claude/worktrees/mockup-restyle` breaks the latter locally; CI is unaffected — see project memory).
- Verification gates for every task that touches source: `pnpm typecheck`, `pnpm exec eslint src e2e`, `pnpm test` (plus `pnpm test:db` for Task 1b, `pnpm test:e2e` for Tasks 2c/3/4).
- Clean Architecture boundaries are ESLint-enforced (`eslint-plugin-boundaries` in `eslint.config.mjs`) — domain imports nothing outward; presentation never imports `@/infrastructure` or `@supabase/*` (guarded again at runtime by `src/test/architecture-boundary.test.ts`).
- Durations: presets may use 0.5s steps; manual steppers still snap to whole seconds. `PHASE_DURATION_LIMITS` (validation range) is unchanged: inhale/exhale 2–15, hold/rest 0–15. `MANUAL_STEPPER_LIMITS` unchanged: hold/rest clamp to 1–15 by hand.
- Catalog (final, exact values):

  | id | name | durations (inhale/hold/exhale/rest) | topOffSeconds | alternateNostrils | recommendedCycles |
  | --- | --- | --- | --- | --- | --- |
  | `acute-de-stress` | Acute De-Stress | 3 / 0 / 6 / 1 | 1 | false | 4 |
  | `mood-elevation` | Mood Elevation | 4 / 2 / 6 / 1 | null | true | 10 |
  | `resonance-coherence` | Resonance Coherence | 5.5 / 0 / 5.5 / 0 | null | false | 25 |
  | `sleep-shift-478` | Sleep Shift (4-7-8) | 4 / 7 / 8 / 1 | null | false | 4 |
  | `executive-focus` | Executive Focus | 4 / 4 / 4 / 4 | null | false | 12 |

  `DEFAULT_PRESET_ID = "resonance-coherence"`. `custom` remains a sixth, non-catalog id.
- Picking a protocol sets the Session Goal to its `recommendedCycles` (as `{ kind: "cycles", cycles }`); the Goal picker can still override afterward. A fresh user's goal stays `null` until a protocol is picked.
- One hint slot under the coaching line: `view.hint` = ramp hint and technique hint joined with `" · "` when both apply (ramp first). Class renamed `.mv-ramp-hint` → `.mv-hint`.
- Idle countdown is `String(Math.ceil(settings.inhale))`; `formatDurationHint`/announcements use the raw (possibly half-integer) value.
- Wiring `applyPreset` to also set the goal must not, as a side effect, trigger the "Goal will apply on your next session." announcement that `setGoal` already emits while running/paused (that message is correct for the Goal picker, not for a preset pick) — `setGoal` is split into an internal `commitGoal(goal, { announce })`, and `applyPreset` calls it with `announce: false`. (`applyPreset` does not touch `goal`/`announcement` at all today — this is a requirement for the new wiring, not a fix to an existing bug.)
- **Unlisted consequence of the default-preset change (flagged during plan review, not in the original spec):** Resonance Coherence has `rest: 0`, so every fresh, un-persisted load renders the **Triangle**, not the Square, and the Triangle is currently the "if rest = 0" fallback path exercised by only a handful of tests. All `e2e/parity.spec.ts` `describe` blocks call `page.goto("/")` unmocked and assert Square-only DOM (`.square-frame-border`, `#side-rest`, `.mv-square-frame .square-content` hidden). Task 2c re-seeds every parity spec to the legacy 4-4-6-2 (Square) preferences via `mockBreathingApi` so those specs keep testing Square geometry as originally intended, and adds one dedicated Triangle-path assertion. This is a test-fixture decision, not a product behavior change: an unauthenticated/first-time real user genuinely sees the Triangle now, which is a direct, accepted consequence of the user's chosen default (documented in the spec's decisions log) — Task 5 records it as a dated parity departure.

---

## Task 0: Branch, GitHub issue, and debate review gate

**Files:** none (process only).

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/protocol-library
```

- [ ] **Step 2: Open the tracking issue with child tickets**

```bash
gh issue create \
  --title "Protocol Library — five science-backed presets" \
  --body "$(cat <<'EOF'
Implements the Protocol Library plan (docs/superpowers/plans/2026-09-06-protocol-library.md):
replace the five-entry preset catalog with five science-backed protocols, add a header
Preset Picker, half-second durations, top-off and nostril cues.

Tracer bullets (each is a child ticket, opened after this issue):
1. Half-second durations (domain + migration + mappers + pgTAP)
2. Technique helpers (src/domain/technique.ts)
3. Catalog swap + ApplyPreset DTO + default preset + recommend() removal
4. Test-fixture migration for the default-duration change (incl. Triangle-default consequence)
5. Preset Picker header disclosure + goal auto-set + goal chip
6. Technique cues (hint merge, nostril hint, top-off cue: audio + announcement + Stage tick)
7. Docs + parity-contract update + issue close-out

Spec: C:\Users\DELL\.claude\plans\scientific-technical-abstract-parasol.md
EOF
)"
```

Note the returned issue number (`$MAP`); create one child issue per tracer bullet with `gh issue create --title "..." --body "Part of #$MAP"` and link them per `docs/agents/issue-tracker.md` conventions (sub-issues API if available, else the `Part of #<n>` body convention).

- [ ] **Step 3: Run the mandatory debate review of this plan before touching code**

Per `CLAUDE.md` ("Debate review" section), every plan gets a two-model debate review before implementation starts. On Windows, set `TMP`/`TEMP`/`TMPDIR` to a path on this repo's volume first (see project memory: local snapshot clones die with "Improper link" otherwise):

```bash
export TMP='D:\dr-tmp'
export TEMP='D:\dr-tmp'
export TMPDIR='D:\dr-tmp'
mkdir -p "$TMP"
```

Then invoke the `debate-review` skill against this plan file (Fable medium vs. Codex high, per CLAUDE.md's configured lanes). Show the resulting report to the user in full before Task 1 begins — do not act on the plan silently. If the debate surfaces a correction, apply it to this plan file and note the change, then proceed.

---

## Task 1a: Half-second domain validation, snap stepper, `cycleSeconds()`

**Files:**
- Modify: `src/domain/breathing-settings.ts`
- Modify: `src/domain/phase.ts` (no rule changes — read to confirm `PHASE_DURATION_LIMITS`/`MANUAL_STEPPER_LIMITS` are untouched)
- Test: `src/test/domain/breathing-settings.test.ts`

**Interfaces:**
- Produces: `BreathingSettings.adjust(phase, direction)` unchanged signature, snap-to-integer behavior on manual step; `BreathingSettings.prototype.cycleSeconds(): number` (sum of the four durations, used by Task 3's dosage line); `isHalfStep(value: number): boolean` (module-private helper, not exported — only `assertDuration`'s error message and behavior are observable).
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

Replace the existing "rejects non-integer and non-finite durations" test and add half-step + `cycleSeconds` coverage in `src/test/domain/breathing-settings.test.ts`:

```ts
  it("accepts half-second durations but rejects quarter-second durations", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
    expect(settings.toDto()).toEqual({ inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 });

    expect(() =>
      BreathingSettings.fromDto({ inhale: 4.25, hold: 4, exhale: 6, rest: 2 }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingSettings.fromDto({ inhale: 4.25, hold: 4, exhale: 6, rest: 2 }),
    ).toThrow(/multiple of 0\.5/);
  });

  it("rejects non-finite durations", () => {
    expect(() =>
      BreathingSettings.fromDto({
        inhale: Number.NaN,
        hold: 4,
        exhale: 6,
        rest: 2,
      }),
    ).toThrow(DomainValidationError);
  });

  it("snaps a half-step increment up to the next whole second, and a half-step decrement down", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
    expect(settings.adjust("inhale", 1).toDto().inhale).toBe(6);
    expect(settings.adjust("inhale", -1).toDto().inhale).toBe(5);
    expect(settings.adjust("exhale", 1).toDto().exhale).toBe(6);
  });

  it("leaves integer stepper behavior byte-identical", () => {
    const settings = BreathingSettings.default();
    expect(settings.adjust("inhale", 1).toDto().inhale).toBe(settings.inhale + 1);
    expect(settings.adjust("inhale", -1).toDto().inhale).toBe(settings.inhale - 1);
  });

  it("sums the four phase durations as cycleSeconds", () => {
    const settings = BreathingSettings.fromDto({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
    expect(settings.cycleSeconds()).toBe(11);
    expect(BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 2 }).cycleSeconds()).toBe(16);
  });
```

Remove the old `it("rejects non-integer and non-finite durations", ...)` block (superseded by the two tests above) and remove `it("defaults to the recommended 4-4-6-2 pattern", ...)` — the default assertion moves to Task 2c once the default value changes (leaving it here now would be a self-contradicting red test after this task; delete it in this task and Task 2c re-adds the new-default version).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/test/domain/breathing-settings.test.ts`
Expected: FAIL — `cycleSeconds is not a function`, half-step values throw `must be an integer`, quarter-step message mismatch.

- [ ] **Step 3: Implement half-step validation, snap adjust, and `cycleSeconds`**

In `src/domain/breathing-settings.ts`, replace `assertDuration` and `adjust`, and add `cycleSeconds`:

```ts
  durationFor(phase: Phase): number {
    return this[phase];
  }

  cycleSeconds(): number {
    return this.inhale + this.hold + this.exhale + this.rest;
  }

  adjust(phase: Phase, direction: number): BreathingSettings {
    const limits = MANUAL_STEPPER_LIMITS[phase];
    const current = this.durationFor(phase);
    const min = Math.min(limits.min, current);
    const snapped =
      direction > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1;
    const next = Math.max(min, Math.min(limits.max, snapped));
    return BreathingSettings.fromDto({
      ...this.toDto(),
      [phase]: next,
    });
  }
}

function isHalfStep(value: number): boolean {
  return Number.isInteger(value * 2);
}

function assertDuration(phase: Phase, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !isHalfStep(value)) {
    throw new DomainValidationError(
      `${phase} duration must be a multiple of 0.5.`,
    );
  }
  const limits = PHASE_DURATION_LIMITS[phase];
  if (value < limits.min || value > limits.max) {
    throw new DomainValidationError(
      `${phase} duration must be between ${limits.min} and ${limits.max}.`,
    );
  }
  return value;
}
```

Note the `adjust` snap rule: incrementing from a fractional current value (e.g. `5.5`) always lands on the next whole second (`Math.floor(5.5) + 1 = 6`), and decrementing always lands on the previous whole second (`Math.ceil(5.5) - 1 = 5`) — for an already-integer `current`, `Math.floor(current) + 1 === current + 1` and `Math.ceil(current) - 1 === current - 1`, so integer behavior is byte-identical, satisfying the test in Step 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/test/domain/breathing-settings.test.ts`
Expected: PASS (the two intentionally-removed default-value tests are absent; everything else green).

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm exec eslint src`
Expected: no errors (no other file references `assertDuration`, `isHalfStep`, or the old error message text, so nothing else breaks).

- [ ] **Step 6: Commit**

```bash
git add src/domain/breathing-settings.ts src/test/domain/breathing-settings.test.ts
git commit -m "feat(domain): accept half-second durations, snap-stepper, cycleSeconds()"
```

---

## Task 1b: Migration, generated types, mappers, pgTAP, request-body round-trip

**Files:**
- Create: `supabase/migrations/20260906120000_half_second_durations.sql`
- Modify: `src/infrastructure/supabase/database.types.ts`
- Modify: `src/infrastructure/mappers/settings-row.ts`
- Modify: `src/infrastructure/mappers/session-row.ts`
- Modify: `supabase/tests/breathing_rls_test.sql`
- Test: `src/test/infrastructure/schema-contract.test.ts`, `src/test/infrastructure/mappers.test.ts`, `src/test/infrastructure/repositories.test.ts`
- Test: `src/test/infrastructure/request-body.test.ts` (new file — no existing dedicated test file for `request-body.ts`; add one)

**Interfaces:**
- Consumes: `BreathingSettingsRow`/`BreathingSessionRow` types from `database.types.ts` (existing shape, four `*_seconds` columns).
- Produces: `settingsRowToDto`, `sessionRowToDto`, `sessionRowToHistoryRecord` all coerce the four duration columns through `Number(...)` (mirroring the existing `elapsed_seconds` pattern) so half-second values round-trip whether Postgres/postgrest returns them as `number` or numeric-string.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260906120000_half_second_durations.sql`:

```sql
-- Widen inhale/hold/exhale/rest duration columns to numeric(3,1) so presets
-- (e.g. Resonance Coherence 5.5/0/5.5/0) can persist half-second durations.
-- Existing integer values round-trip unchanged; new half-step check constraints
-- reject anything not a multiple of 0.5.

alter table public.breathing_settings
  alter column inhale_seconds type numeric(3,1),
  alter column hold_seconds type numeric(3,1),
  alter column exhale_seconds type numeric(3,1),
  alter column rest_seconds type numeric(3,1);

alter table public.breathing_settings
  add constraint breathing_settings_inhale_seconds_half_step_check
    check ((inhale_seconds * 2) = floor(inhale_seconds * 2)),
  add constraint breathing_settings_hold_seconds_half_step_check
    check ((hold_seconds * 2) = floor(hold_seconds * 2)),
  add constraint breathing_settings_exhale_seconds_half_step_check
    check ((exhale_seconds * 2) = floor(exhale_seconds * 2)),
  add constraint breathing_settings_rest_seconds_half_step_check
    check ((rest_seconds * 2) = floor(rest_seconds * 2));

alter table public.breathing_sessions
  alter column inhale_seconds type numeric(3,1),
  alter column hold_seconds type numeric(3,1),
  alter column exhale_seconds type numeric(3,1),
  alter column rest_seconds type numeric(3,1);

alter table public.breathing_sessions
  add constraint breathing_sessions_inhale_seconds_half_step_check
    check ((inhale_seconds * 2) = floor(inhale_seconds * 2)),
  add constraint breathing_sessions_hold_seconds_half_step_check
    check ((hold_seconds * 2) = floor(hold_seconds * 2)),
  add constraint breathing_sessions_exhale_seconds_half_step_check
    check ((exhale_seconds * 2) = floor(exhale_seconds * 2)),
  add constraint breathing_sessions_rest_seconds_half_step_check
    check ((rest_seconds * 2) = floor(rest_seconds * 2));
```

`rest_seconds default 2` on `breathing_settings` stays untouched (harmless — every write sets all four columns explicitly via `settingsDtoToRow`).

- [ ] **Step 2: Update generated types**

In `src/infrastructure/supabase/database.types.ts`, change the four duration fields on `BreathingSettingsRow` and `BreathingSessionRow`'s `Row` type to `number | string` (mirroring `elapsed_seconds`'s existing pattern), keep `Insert`/`Update` as `number`:

```ts
export type BreathingSettingsRow = {
  user_id: string;
  inhale_seconds: number | string;
  hold_seconds: number | string;
  exhale_seconds: number | string;
  rest_seconds: number | string;
  goal_type: "minutes" | "cycles" | null;
  goal_value: number | null;
  ramp: string | null;
  created_at: string;
  updated_at: string;
};

export type BreathingSessionRow = {
  id: string;
  user_id: string;
  cycle_count: number;
  elapsed_seconds: number | string;
  inhale_seconds: number | string;
  hold_seconds: number | string;
  exhale_seconds: number | string;
  rest_seconds: number | string;
  created_at: string;
};
```

Leave every `Insert`/`Update` field for the four duration columns as `number` (unchanged) — the app always writes plain numbers; only reads may come back as numeric-strings.

- [ ] **Step 3: Write the failing mapper tests**

Add to `src/test/infrastructure/mappers.test.ts` (new `describe` blocks, after the existing `"session row mapper"` block):

```ts
describe("settings row mapper coerces numeric-string durations", () => {
  it("coerces string duration columns to numbers", () => {
    expect(
      settingsRowToDto({
        inhale_seconds: "5.5",
        hold_seconds: "0",
        exhale_seconds: "5.5",
        rest_seconds: "0",
        goal_type: null,
        goal_value: null,
        ramp: null,
      }),
    ).toEqual({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
      goal: null,
      ramp: null,
    });
  });
});

describe("session row mapper coerces numeric-string durations", () => {
  it("coerces string duration columns on sessionRowToDto", () => {
    expect(
      sessionRowToDto({
        id: SESSION_ID,
        user_id: USER_ID,
        cycle_count: 1,
        elapsed_seconds: "12",
        inhale_seconds: "3",
        hold_seconds: "0",
        exhale_seconds: "6",
        rest_seconds: "1",
      }),
    ).toEqual({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 1,
      elapsedSeconds: 12,
      durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
    });
  });

  it("coerces string duration columns on sessionRowToHistoryRecord", () => {
    expect(
      sessionRowToHistoryRecord(
        {
          cycle_count: 4,
          elapsed_seconds: "44",
          inhale_seconds: "5.5",
          hold_seconds: "0",
          exhale_seconds: "5.5",
          rest_seconds: "0",
          created_at: "2026-09-06T00:00:00Z",
        },
        "UTC",
      ),
    ).toMatchObject({
      cycleCount: 4,
      elapsedSeconds: 44,
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
    });
  });
});
```

Add `sessionRowToHistoryRecord` to the existing import line at the top of the file if not already imported (it currently imports `sessionDtoToRow, sessionRowToDto, settingsDtoToRow, settingsRowToDto`).

- [ ] **Step 4: Run mapper tests to verify they fail**

Run: `pnpm vitest run src/test/infrastructure/mappers.test.ts`
Expected: FAIL — string durations pass straight through unconverted, e.g. `durations.inhale` is `"5.5"` not `5.5`.

- [ ] **Step 5: Implement `Number(...)` coercion in the three row readers**

In `src/infrastructure/mappers/settings-row.ts`, `settingsRowToDto`:

```ts
export function settingsRowToDto(
  row: Pick<
    BreathingSettingsRow,
    | "inhale_seconds"
    | "hold_seconds"
    | "exhale_seconds"
    | "rest_seconds"
    | "goal_type"
    | "goal_value"
    | "ramp"
  >,
): BreathingPreferencesDto {
  return {
    durations: {
      inhale: Number(row.inhale_seconds),
      hold: Number(row.hold_seconds),
      exhale: Number(row.exhale_seconds),
      rest: Number(row.rest_seconds),
    },
    goal: goalFromRow(row.goal_type, row.goal_value),
    ramp: rampFromDto(row.ramp),
  };
}
```

In `src/infrastructure/mappers/session-row.ts`, apply the same `Number(...)` wrap to the four duration reads in both `sessionRowToDto` and `sessionRowToHistoryRecord`:

```ts
export function sessionRowToDto(
  row: Pick<
    BreathingSessionRow,
    | "id"
    | "user_id"
    | "cycle_count"
    | "elapsed_seconds"
    | "inhale_seconds"
    | "hold_seconds"
    | "exhale_seconds"
    | "rest_seconds"
  >,
): BreathingSessionDto {
  return {
    id: row.id,
    userId: row.user_id,
    cycleCount: row.cycle_count,
    elapsedSeconds: Number(row.elapsed_seconds),
    durations: {
      inhale: Number(row.inhale_seconds),
      hold: Number(row.hold_seconds),
      exhale: Number(row.exhale_seconds),
      rest: Number(row.rest_seconds),
    },
  };
}

// ... sessionDtoToRow unchanged ...

export function sessionRowToHistoryRecord(
  row: SessionHistoryRow,
  timeZone: string,
): SessionHistoryRecordDto {
  const createdAtEpochMs = Date.parse(row.created_at);
  return {
    cycleCount: row.cycle_count,
    elapsedSeconds: Number(row.elapsed_seconds),
    durations: {
      inhale: Number(row.inhale_seconds),
      hold: Number(row.hold_seconds),
      exhale: Number(row.exhale_seconds),
      rest: Number(row.rest_seconds),
    },
    createdAtEpochMs,
    calendarDay: calendarDayFromIso(row.created_at, timeZone),
  };
}
```

`sessionDtoToRow` and `settingsDtoToRow` (DTO → row, for inserts/upserts) are unchanged — they already write plain numbers.

- [ ] **Step 6: Run mapper tests to verify they pass**

Run: `pnpm vitest run src/test/infrastructure/mappers.test.ts`
Expected: PASS.

- [ ] **Step 7: Update `schema-contract.test.ts` for the half-step constraints**

Add to `src/test/infrastructure/schema-contract.test.ts`, inside the `"enforces duration and session checks plus the history index"` test, after the existing `rest_seconds between 0 and 15` assertion:

```ts
    expect(migration).toMatch(/inhale_seconds \* 2\) = floor\(inhale_seconds \* 2\)/);
    expect(migration).toMatch(/alter column inhale_seconds type numeric\(3,1\)/);
```

(The migration-concatenation approach in this test file reads every file under `supabase/migrations`, so the new file is picked up automatically — no other change needed there.)

- [ ] **Step 8: Update `repositories.test.ts`'s stored-row fixtures to numeric-string durations where they exercise the read path**

In `src/test/infrastructure/repositories.test.ts`, the `"maps a stored row to a DTO"` test (around the `SupabaseSettingsRepository` describe block) currently supplies `inhale_seconds: 5` etc. as plain numbers — leave that test as-is (it proves numbers still work) and add one new test asserting the string-coercion path end-to-end through the repository:

```ts
  it("coerces a numeric-string duration returned by postgrest", async () => {
    const repository = new SupabaseSettingsRepository(
      {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          user_id: USER_ID,
                          inhale_seconds: "5.5",
                          hold_seconds: "0",
                          exhale_seconds: "5.5",
                          rest_seconds: "0",
                          goal_type: null,
                          goal_value: null,
                          ramp: null,
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await expect(repository.getByUserId(USER_ID)).resolves.toEqual({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
      goal: null,
      ramp: null,
    });
  });
```

- [ ] **Step 9: Write the request-body round-trip test**

Create `src/test/infrastructure/request-body.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DomainValidationError } from "@/domain";
import { preferencesFromRequestBody } from "@/infrastructure";

describe("preferencesFromRequestBody half-second durations", () => {
  it("passes a half-second duration through unchanged", () => {
    const result = preferencesFromRequestBody({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
    });
    expect(result.durations).toEqual({ inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 });
  });

  it("accepts a quarter-second value at the HTTP boundary (validation is a domain concern)", () => {
    // request-body.ts's asNumber only checks "is a finite number" — half-step
    // rejection happens downstream in BreathingSettings.fromDto, not here.
    const result = preferencesFromRequestBody({
      durations: { inhale: 4.25, hold: 4, exhale: 6, rest: 2 },
    });
    expect(result.durations.inhale).toBe(4.25);
  });
});

describe("BreathingSettings.fromDto rejects the request-body output when not half-step", () => {
  it("throws when the HTTP layer's request-body durations aren't half-step", async () => {
    const { BreathingSettings } = await import("@/domain");
    const preferences = { durations: { inhale: 4.25, hold: 4, exhale: 6, rest: 2 } };
    expect(() => BreathingSettings.fromDto(preferences.durations)).toThrow(
      DomainValidationError,
    );
  });
});
```

- [ ] **Step 10: Run infra tests to verify they pass**

Run: `pnpm vitest run src/test/infrastructure`
Expected: PASS across `schema-contract.test.ts`, `mappers.test.ts`, `repositories.test.ts`, `request-body.test.ts`.

- [ ] **Step 11: Update pgTAP — cast integer-literal comparisons and add half-step assertions**

In `supabase/tests/breathing_rls_test.sql`, every `results_eq` comparing a `*_seconds` column against an `array[N]` integer literal needs a `::numeric` cast now that the column type is `numeric(3,1)`. Update each occurrence (lines identified during research: the `inhale_seconds` `results_eq` blocks). Example diff for one (repeat the same `array[N]` → `array[N::numeric]` edit for every `results_eq` whose expected array holds a bare duration literal — search the file for `array[` results wrapped around `_seconds` selects/returns):

```sql
select results_eq(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 4, 4, 6, 2)
    returning inhale_seconds$$,
  array[4::numeric],
  'the owner creates their own settings'
);
```

Apply the same `::numeric` cast to the `array[7]`, `array[5]`, `array[15]` results in the file (the `update ... set inhale_seconds = 7 returning inhale_seconds`, the second-user `insert ... returning inhale_seconds` at `5`, and the `set inhale_seconds = 15 returning inhale_seconds` block).

Then bump `select plan(30);` at the top to `select plan(32);` and add two new assertions right after the existing `'zero hold and rest are accepted by check constraints'` block:

```sql
select lives_ok(
  $$insert into public.breathing_settings (user_id, inhale_seconds, hold_seconds, exhale_seconds, rest_seconds)
    values ('11111111-1111-4111-8111-111111111111', 5.5, 0, 5.5, 0)
    on conflict (user_id) do update set inhale_seconds = 5.5, exhale_seconds = 5.5$$,
  'half-second inhale/exhale durations are accepted'
);

select throws_ok(
  $$update public.breathing_settings set inhale_seconds = 4.25 where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'a quarter-second duration is rejected by the half-step check constraint'
);
```

Place these before the `set_config` switch to the second user (`22222222-...`), so they still run as the owner. Verify the final assertion count matches `plan(32)` by counting every `select results_eq(`, `select throws_ok(`, `select lives_ok(`, `select is_empty(` call in the file (30 originally + 2 new = 32).

- [ ] **Step 12: Run the pgTAP suite**

Run: `pnpm test:db`
Expected: PASS, 32/32. (Requires the local Supabase stack running; if it isn't, start it per the project's normal Supabase CLI workflow before running this step — this plan does not change that workflow.)

- [ ] **Step 13: Full verification for this task**

Run: `pnpm typecheck && pnpm exec eslint src && pnpm test`
Expected: all green (this task does not touch presentation, so `pnpm test` in full should already pass — the domain catalog still validates 4/4/6/2-style integers fine, half-step support is additive).

- [ ] **Step 14: Commit**

```bash
git add supabase/migrations/20260906120000_half_second_durations.sql \
  src/infrastructure/supabase/database.types.ts \
  src/infrastructure/mappers/settings-row.ts \
  src/infrastructure/mappers/session-row.ts \
  supabase/tests/breathing_rls_test.sql \
  src/test/infrastructure/schema-contract.test.ts \
  src/test/infrastructure/mappers.test.ts \
  src/test/infrastructure/repositories.test.ts \
  src/test/infrastructure/request-body.test.ts
git commit -m "feat(infra): widen duration columns to numeric(3,1) for half-second presets"
```

---

## Task 2a: `src/domain/technique.ts` — pure cue helpers

**Files:**
- Create: `src/domain/technique.ts`
- Test: `src/test/domain/technique.test.ts`
- Modify: `src/domain/index.ts` (export the new helpers)

**Interfaces:**
- Consumes: nothing from Task 1a/1b beyond `BreathingSettingsDto`/`Phase` (already exported from domain).
- Produces (used by Task 4):
  - `inhaleTopOffBoundary(topOffSeconds: number | null, inhaleDuration: number): number | null`
  - `crossedTopOff(prevPhaseElapsedSeconds: number, nextPhaseElapsedSeconds: number, boundary: number | null): boolean`
  - `nostrilFor(cycleCount: number, phase: Phase): "left" | "right" | null`
  - `techniqueHint(preset: BreathingPresetDto | null, phase: Phase, crossedBoundary: boolean, cycleCount: number): string | null`

This task is written and tested standalone, against a hand-built fixture DTO shape, so it does not depend on the catalog swap (Task 2b) landing first — satisfying the ordering note that Resonance's 5.5 must pass validation before the catalog swap, while letting the pure cue logic land independently.

- [ ] **Step 1: Write the failing tests**

Create `src/test/domain/technique.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  crossedTopOff,
  inhaleTopOffBoundary,
  nostrilFor,
  techniqueHint,
} from "@/domain/technique";
import type { BreathingPresetDto } from "@/domain/breathing-preset";

const SIGH_PRESET: BreathingPresetDto = {
  id: "acute-de-stress",
  name: "Acute De-Stress",
  description: "Physiological sigh — a double inhale and long exhale.",
  durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
  recommendedCycles: 4,
  topOffSeconds: 1,
  alternateNostrils: false,
};

const NOSTRIL_PRESET: BreathingPresetDto = {
  id: "mood-elevation",
  name: "Mood Elevation",
  description: "Nadi Shodhana — alternate-nostril breathing.",
  durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
  recommendedCycles: 10,
  topOffSeconds: null,
  alternateNostrils: true,
};

const PLAIN_PRESET: BreathingPresetDto = {
  id: "executive-focus",
  name: "Executive Focus",
  description: "Box breathing.",
  durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
  recommendedCycles: 12,
  topOffSeconds: null,
  alternateNostrils: false,
};

describe("inhaleTopOffBoundary", () => {
  it("is inhaleDuration - topOffSeconds when topOffSeconds is set", () => {
    expect(inhaleTopOffBoundary(1, 3)).toBe(2);
  });

  it("is null when topOffSeconds is null", () => {
    expect(inhaleTopOffBoundary(null, 3)).toBeNull();
  });

  it("stays ramp-safe: recomputed against the live inhale duration, not the base", () => {
    // A Ramp that lengthens inhale to 5s still boundary-s at 5 - 1 = 4.
    expect(inhaleTopOffBoundary(1, 5)).toBe(4);
  });
});

describe("crossedTopOff", () => {
  it("is true when elapsed crosses the boundary within one frame", () => {
    expect(crossedTopOff(1.8, 2.1, 2)).toBe(true);
  });

  it("is false when elapsed stays below the boundary", () => {
    expect(crossedTopOff(1.0, 1.5, 2)).toBe(false);
  });

  it("is false once elapsed is already past the boundary (fires once, not every frame)", () => {
    expect(crossedTopOff(2.1, 2.4, 2)).toBe(false);
  });

  it("is false when boundary is null", () => {
    expect(crossedTopOff(1.8, 2.1, null)).toBe(false);
  });

  it("counts landing exactly on the boundary as crossed", () => {
    expect(crossedTopOff(1.8, 2.0, 2)).toBe(true);
  });
});

describe("nostrilFor", () => {
  it("even cycles: inhale is left, exhale is right", () => {
    expect(nostrilFor(0, "inhale")).toBe("left");
    expect(nostrilFor(0, "exhale")).toBe("right");
    expect(nostrilFor(2, "inhale")).toBe("left");
  });

  it("odd cycles: inhale is right, exhale is left", () => {
    expect(nostrilFor(1, "inhale")).toBe("right");
    expect(nostrilFor(1, "exhale")).toBe("left");
  });

  it("hold and rest are never nostril-cued", () => {
    expect(nostrilFor(0, "hold")).toBeNull();
    expect(nostrilFor(0, "rest")).toBeNull();
    expect(nostrilFor(1, "hold")).toBeNull();
  });
});

describe("techniqueHint", () => {
  it("is null when preset is null", () => {
    expect(techniqueHint(null, "inhale", false, 0)).toBeNull();
  });

  it("is null for a preset with neither topOffSeconds nor alternateNostrils", () => {
    expect(techniqueHint(PLAIN_PRESET, "inhale", false, 0)).toBeNull();
  });

  it("shows the top-off hint only after the boundary is crossed, and only on inhale", () => {
    expect(techniqueHint(SIGH_PRESET, "inhale", false, 0)).toBeNull();
    expect(techniqueHint(SIGH_PRESET, "inhale", true, 0)).toBe("Top-off breath");
    expect(techniqueHint(SIGH_PRESET, "exhale", true, 0)).toBeNull();
  });

  it("shows the nostril hint on inhale and exhale, alternating by cycle", () => {
    expect(techniqueHint(NOSTRIL_PRESET, "inhale", false, 0)).toBe("Left nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "exhale", false, 0)).toBe("Right nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "inhale", false, 1)).toBe("Right nostril");
    expect(techniqueHint(NOSTRIL_PRESET, "hold", false, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/test/domain/technique.test.ts`
Expected: FAIL — `Cannot find module '@/domain/technique'`.

- [ ] **Step 3: Implement `src/domain/technique.ts`**

```ts
import type { BreathingPresetDto } from "./breathing-preset";
import type { Phase } from "./phase";

/**
 * Boundary (seconds into the inhale phase) at which the sigh's second,
 * "top-off" inhale segment begins. Recomputed against the live inhale
 * duration passed in, so a Ramp that lengthens inhale keeps the boundary
 * correct without this module knowing anything about Ramp.
 */
export function inhaleTopOffBoundary(
  topOffSeconds: number | null,
  inhaleDuration: number,
): number | null {
  if (topOffSeconds === null) return null;
  return inhaleDuration - topOffSeconds;
}

/**
 * True exactly on the frame that carries `phaseElapsedSeconds` across
 * `boundary` — fires once per inhale phase, not on every frame past it.
 */
export function crossedTopOff(
  prevPhaseElapsedSeconds: number,
  nextPhaseElapsedSeconds: number,
  boundary: number | null,
): boolean {
  if (boundary === null) return false;
  return prevPhaseElapsedSeconds < boundary && nextPhaseElapsedSeconds >= boundary;
}

/**
 * Alternate-nostril cue for Nadi Shodhana. Even completed-cycle counts
 * inhale on the left / exhale on the right; odd counts swap. Hold and Rest
 * carry no nostril (nothing to alternate during a held or resting breath).
 */
export function nostrilFor(
  cycleCount: number,
  phase: Phase,
): "left" | "right" | null {
  if (phase !== "inhale" && phase !== "exhale") return null;
  const isEvenCycle = cycleCount % 2 === 0;
  if (phase === "inhale") {
    return isEvenCycle ? "left" : "right";
  }
  return isEvenCycle ? "right" : "left";
}

/**
 * One short technique-specific hint string for the active preset and phase,
 * or null when the preset carries no technique cue for this moment. Callers
 * merge this with the Ramp hint (see view-model.ts's `hint` field).
 */
export function techniqueHint(
  preset: BreathingPresetDto | null,
  phase: Phase,
  crossedTopOffBoundary: boolean,
  cycleCount: number,
): string | null {
  if (preset === null) return null;

  if (preset.topOffSeconds !== null && phase === "inhale" && crossedTopOffBoundary) {
    return "Top-off breath";
  }

  if (preset.alternateNostrils) {
    const side = nostrilFor(cycleCount, phase);
    if (side === "left") return "Left nostril";
    if (side === "right") return "Right nostril";
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/test/domain/technique.test.ts`
Expected: PASS.

- [ ] **Step 5: Export from `src/domain/index.ts`**

Add after the `ramp` export block:

```ts
export {
  crossedTopOff,
  inhaleTopOffBoundary,
  nostrilFor,
  techniqueHint,
} from "./technique";
```

- [ ] **Step 6: Typecheck, lint, full domain test run**

Run: `pnpm typecheck && pnpm exec eslint src && pnpm vitest run src/test/domain`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/domain/technique.ts src/test/domain/technique.test.ts src/domain/index.ts
git commit -m "feat(domain): add technique.ts — top-off and nostril cue helpers"
```

---

## Task 2b: Catalog swap, `BreathingPresetDto` fields, `ApplyPreset` DTO, default preset, remove `recommend()`

**Files:**
- Modify: `src/domain/breathing-preset.ts`
- Modify: `src/domain/breathing-settings.ts` (`DEFAULT_DURATIONS` only)
- Modify: `src/application/apply-preset.ts`
- Modify: `src/presentation/use-breathing-engine.ts` (remove `recommend`, update `applyPreset` to consume the full DTO)
- Modify: `src/presentation/index.ts` if `recommend` is re-exported anywhere (it is not — `useBreathingEngine`'s return value is not itself re-exported as a type here, so no index change is needed; verify during Step 3)
- Test: `src/test/domain/breathing-preset.test.ts`, `src/test/application/apply-preset.test.ts`

**Interfaces:**
- Consumes: `BreathingSettings.fromDto` (Task 1a, half-step-aware), `sessionGoalFromDto` from `session-goal.ts` (existing, used inside `BreathingPreset.create` for `recommendedCycles` validation — no new export needed from `session-goal.ts`).
- Produces: `BreathingPresetDto` gains `recommendedCycles: number`, `topOffSeconds: number | null`, `alternateNostrils: boolean`. `ApplyPreset.execute(presetId): BreathingPresetDto` (full DTO, not just durations) — this is the interface Task 3's hook wiring and Task 3's Preset Picker component consume.

- [ ] **Step 1: Write the failing catalog tests**

Replace the full contents of `src/test/domain/breathing-preset.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  BREATHING_PRESET_CATALOG,
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
} from "@/domain/breathing-preset";
import { BreathingSettings } from "@/domain/breathing-settings";
import { DomainValidationError } from "@/domain/errors";

describe("BreathingPreset catalog", () => {
  it("lists five named protocols with Resonance Coherence as default", () => {
    expect(BREATHING_PRESET_CATALOG).toHaveLength(5);
    expect(DEFAULT_PRESET_ID).toBe("resonance-coherence");
    expect(findPresetById("resonance-coherence")?.durations).toEqual({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
  });

  it("includes the physiological sigh with a 1s top-off boundary", () => {
    const preset = findPresetById("acute-de-stress");
    expect(preset?.durations).toEqual({ inhale: 3, hold: 0, exhale: 6, rest: 1 });
    expect(preset?.topOffSeconds).toBe(1);
    expect(preset?.alternateNostrils).toBe(false);
    expect(preset?.recommendedCycles).toBe(4);
  });

  it("includes nadi shodhana with alternate nostrils and no top-off", () => {
    const preset = findPresetById("mood-elevation");
    expect(preset?.durations).toEqual({ inhale: 4, hold: 2, exhale: 6, rest: 1 });
    expect(preset?.topOffSeconds).toBeNull();
    expect(preset?.alternateNostrils).toBe(true);
    expect(preset?.recommendedCycles).toBe(10);
  });

  it("includes 4-7-8 sleep shift and box executive focus with plain durations", () => {
    expect(findPresetById("sleep-shift-478")?.durations).toEqual({
      inhale: 4,
      hold: 7,
      exhale: 8,
      rest: 1,
    });
    expect(findPresetById("sleep-shift-478")?.recommendedCycles).toBe(4);
    expect(findPresetById("executive-focus")?.durations).toEqual({
      inhale: 4,
      hold: 4,
      exhale: 4,
      rest: 4,
    });
    expect(findPresetById("executive-focus")?.recommendedCycles).toBe(12);
  });

  it("validates every preset's durations through BreathingSettings, including half-second Resonance", () => {
    for (const preset of BREATHING_PRESET_CATALOG) {
      expect(() => BreathingSettings.fromDto(preset.durations)).not.toThrow();
    }
  });

  it("matches preset ids from durations and falls back to custom", () => {
    expect(matchPresetId(BreathingSettings.default().toDto())).toBe("resonance-coherence");
    expect(matchPresetId({ inhale: 5, hold: 3, exhale: 7, rest: 2 })).toBe("custom");
  });

  it("rejects a preset whose topOffSeconds is not less than its inhale duration", () => {
    const { BreathingPreset } = require("@/domain/breathing-preset") as typeof import("@/domain/breathing-preset");
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Bad",
        description: "bad",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 3,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("rejects a preset with a recommendedCycles outside the session-goal cycle limits", () => {
    const { BreathingPreset } = require("@/domain/breathing-preset") as typeof import("@/domain/breathing-preset");
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Bad",
        description: "bad",
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        recommendedCycles: 101,
        topOffSeconds: null,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("rejects a zero or negative topOffSeconds", () => {
    const { BreathingPreset } = require("@/domain/breathing-preset") as typeof import("@/domain/breathing-preset");
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Bad",
        description: "bad",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 0,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Bad",
        description: "bad",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: -1,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("rejects a topOffSeconds that is not a multiple of 0.5", () => {
    const { BreathingPreset } = require("@/domain/breathing-preset") as typeof import("@/domain/breathing-preset");
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Bad",
        description: "bad",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 0.75,
        alternateNostrils: false,
      }),
    ).toThrow(DomainValidationError);
  });

  it("accepts a valid half-second topOffSeconds strictly less than inhale", () => {
    const { BreathingPreset } = require("@/domain/breathing-preset") as typeof import("@/domain/breathing-preset");
    expect(() =>
      BreathingPreset.create({
        id: "custom",
        name: "Ok",
        description: "ok",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 1.5,
        alternateNostrils: false,
      }),
    ).not.toThrow();
  });
});
```

(Using `require` inline for the two validation-failure tests keeps the top-level import list unchanged from the passing tests above; if the project's lint config forbids `require` in test files, use a top-level `import { BreathingPreset } from "@/domain/breathing-preset";` instead — check `eslint.config.mjs`'s rules for `src/test/**` before deciding; prefer the plain top-level import for consistency with the rest of the codebase.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/test/domain/breathing-preset.test.ts`
Expected: FAIL — catalog still has the old 5 ids/durations, `DEFAULT_PRESET_ID` is `"current-calm"`, `BreathingPresetDto` has no `recommendedCycles`/`topOffSeconds`/`alternateNostrils`.

- [ ] **Step 3: Rewrite `src/domain/breathing-preset.ts`**

```ts
import { DomainValidationError } from "./errors";
import type { BreathingSettingsDto } from "./breathing-settings";
import { BreathingSettings } from "./breathing-settings";
import { sessionGoalFromDto, type SessionGoal } from "./session-goal";

export type BreathingPresetId =
  | "acute-de-stress"
  | "mood-elevation"
  | "resonance-coherence"
  | "sleep-shift-478"
  | "executive-focus"
  | "custom";

export const DEFAULT_PRESET_ID: BreathingPresetId = "resonance-coherence";

export type BreathingPresetDto = {
  id: BreathingPresetId;
  name: string;
  description: string;
  durations: BreathingSettingsDto;
  /** Dosage: cycle count applied as the Session Goal when this preset is selected. */
  recommendedCycles: number;
  /** Physiological sigh's second inhale segment; null when the technique has none. */
  topOffSeconds: number | null;
  /** Nadi Shodhana's per-cycle left/right cue. */
  alternateNostrils: boolean;
};

export class BreathingPreset {
  readonly id: BreathingPresetId;
  readonly name: string;
  readonly description: string;
  readonly durations: BreathingSettingsDto;
  readonly recommendedCycles: number;
  readonly topOffSeconds: number | null;
  readonly alternateNostrils: boolean;

  private constructor(dto: BreathingPresetDto) {
    this.id = dto.id;
    this.name = dto.name;
    this.description = dto.description;
    this.durations = { ...dto.durations };
    this.recommendedCycles = dto.recommendedCycles;
    this.topOffSeconds = dto.topOffSeconds;
    this.alternateNostrils = dto.alternateNostrils;
    Object.freeze(this);
  }

  static create(dto: BreathingPresetDto): BreathingPreset {
    if (!dto.id || !dto.name || !dto.description) {
      throw new DomainValidationError("Preset requires id, name, and description.");
    }
    const durations = BreathingSettings.fromDto(dto.durations);
    if (dto.topOffSeconds !== null) {
      if (!Number.isFinite(dto.topOffSeconds) || dto.topOffSeconds <= 0) {
        throw new DomainValidationError("topOffSeconds must be a positive number.");
      }
      if (Number.isInteger(dto.topOffSeconds * 2) === false) {
        throw new DomainValidationError("topOffSeconds must be a multiple of 0.5.");
      }
      if (dto.topOffSeconds >= durations.inhale) {
        throw new DomainValidationError(
          "topOffSeconds must be less than the preset's inhale duration.",
        );
      }
    }
    // Reuses SessionGoal's own cycle-count validation (1-100) rather than
    // duplicating its limits here.
    sessionGoalFromDto({ kind: "cycles", cycles: dto.recommendedCycles });
    return new BreathingPreset(dto);
  }

  toDto(): BreathingPresetDto {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      durations: { ...this.durations },
      recommendedCycles: this.recommendedCycles,
      topOffSeconds: this.topOffSeconds,
      alternateNostrils: this.alternateNostrils,
    };
  }
}

/** The Session Goal a preset's dosage maps to when it is selected. */
export function presetToGoal(preset: BreathingPreset | BreathingPresetDto): SessionGoal {
  return { kind: "cycles", cycles: preset.recommendedCycles };
}

export const BREATHING_PRESET_CATALOG: readonly BreathingPreset[] = [
  BreathingPreset.create({
    id: "acute-de-stress",
    name: "Acute De-Stress",
    description:
      "Physiological sigh — a double inhale (3s + 1s top-off) and a long 6s exhale, fast-acting for acute stress.",
    durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
    recommendedCycles: 4,
    topOffSeconds: 1,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "mood-elevation",
    name: "Mood Elevation",
    description:
      "Nadi Shodhana (alternate-nostril breathing) — inhale 4s, hold 2s, exhale 6s, rest 1s, alternating sides each cycle.",
    durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
    recommendedCycles: 10,
    topOffSeconds: null,
    alternateNostrils: true,
  }),
  BreathingPreset.create({
    id: "resonance-coherence",
    name: "Resonance Coherence",
    description: "Inhale 5.5s, exhale 5.5s — resonance-frequency breathing at ~5.5 breaths/min.",
    durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
    recommendedCycles: 25,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "sleep-shift-478",
    name: "Sleep Shift (4-7-8)",
    description: "Inhale 4s, hold 7s, exhale 8s, rest 1s — a relaxation pattern used before sleep.",
    durations: { inhale: 4, hold: 7, exhale: 8, rest: 1 },
    recommendedCycles: 4,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
  BreathingPreset.create({
    id: "executive-focus",
    name: "Executive Focus",
    description: "Box breathing — equal 4s phases for sustained, even attention.",
    durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
    recommendedCycles: 12,
    topOffSeconds: null,
    alternateNostrils: false,
  }),
];

export function findPresetById(id: string): BreathingPreset | null {
  return BREATHING_PRESET_CATALOG.find((preset) => preset.id === id) ?? null;
}

export function matchPresetId(
  durations: BreathingSettingsDto,
): BreathingPresetId {
  for (const preset of BREATHING_PRESET_CATALOG) {
    const d = preset.durations;
    if (
      d.inhale === durations.inhale &&
      d.hold === durations.hold &&
      d.exhale === durations.exhale &&
      d.rest === durations.rest
    ) {
      return preset.id;
    }
  }
  return "custom";
}
```

Note: `presetToGoal` is exported per the spec's helper list even though Task 3's hook wiring inlines the equivalent one-liner (`{ kind: "cycles", cycles: dto.recommendedCycles }`) — keep both call sites consistent by having Task 3 import and use `presetToGoal` rather than duplicating the object literal.

- [ ] **Step 4: Update `DEFAULT_DURATIONS` in `breathing-settings.ts`**

In `src/domain/breathing-settings.ts`, change:

```ts
const DEFAULT_DURATIONS: BreathingSettingsDto = {
  inhale: 5.5,
  hold: 0,
  exhale: 5.5,
  rest: 0,
};
```

- [ ] **Step 5: Run domain tests to verify catalog + default pass, and note expected new failures elsewhere**

Run: `pnpm vitest run src/test/domain/breathing-preset.test.ts`
Expected: PASS.

Run: `pnpm vitest run src/test/domain` (full domain suite)
Expected: many failures in `breathing-settings.test.ts` (`default()` now returns `5.5/0/5.5/0`, no test currently asserts that — Task 2c fixes this), `advance-breathing-state.test.ts`, `session-goal.test.ts` (both use `BreathingSettings.default()` as their fixture) — **this is expected and intentional**; Task 2c is the dedicated task that repairs every test fixture touched by the default-duration change, across domain, application, infrastructure, and presentation. Do not fix them in this task — that keeps this task's diff reviewable as "catalog + DTO shape" only.

- [ ] **Step 6: Update `ApplyPreset` and its test**

`src/application/apply-preset.ts`:

```ts
import { findPresetById, type BreathingPresetDto } from "@/domain";
import { DomainValidationError } from "@/domain/errors";

export class ApplyPreset {
  execute(presetId: string): BreathingPresetDto {
    const preset = findPresetById(presetId);
    if (preset === null) {
      throw new DomainValidationError(`Unknown breathing preset: ${presetId}.`);
    }
    return preset.toDto();
  }
}
```

(`findPresetById` returns an already-validated `BreathingPreset` — `BreathingPreset.create` ran `BreathingSettings.fromDto` at catalog-construction time, so re-validating here is redundant; `toDto()` is a plain, cheap object copy.)

Replace `src/test/application/apply-preset.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ApplyPreset } from "@/application/apply-preset";
import { DomainValidationError } from "@/domain/errors";

describe("ApplyPreset", () => {
  it("returns the full preset DTO for a catalog preset", () => {
    const useCase = new ApplyPreset();
    expect(useCase.execute("executive-focus")).toEqual({
      id: "executive-focus",
      name: "Executive Focus",
      description: "Box breathing — equal 4s phases for sustained, even attention.",
      durations: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
      recommendedCycles: 12,
      topOffSeconds: null,
      alternateNostrils: false,
    });
  });

  it("includes topOffSeconds and alternateNostrils for their respective protocols", () => {
    const useCase = new ApplyPreset();
    expect(useCase.execute("acute-de-stress").topOffSeconds).toBe(1);
    expect(useCase.execute("mood-elevation").alternateNostrils).toBe(true);
  });

  it("rejects unknown preset ids", () => {
    const useCase = new ApplyPreset();
    expect(() => useCase.execute("unknown")).toThrow(DomainValidationError);
  });
});
```

- [ ] **Step 7: Run application tests**

Run: `pnpm vitest run src/test/application/apply-preset.test.ts`
Expected: PASS.

- [ ] **Step 8: Remove `recommend()` from `useBreathingEngine` and update `applyPreset` to consume the full DTO**

In `src/presentation/use-breathing-engine.ts`, `applyPreset` currently does:

```ts
  const applyPreset = useCallback(
    (presetId: BreathingPresetId) => {
      if (presetId === "custom") return;
      const dto = new ApplyPreset().execute(presetId);
      const next = BreathingSettings.fromDto(dto);
      settingsRef.current = next;
      activePresetIdRef.current = presetId;
      setSettings(next);
      setActivePresetId(presetId);
      queueSettingsSave();
    },
    [queueSettingsSave],
  );
```

`ApplyPreset.execute` now returns `BreathingPresetDto`, not `BreathingSettingsDto`, so `BreathingSettings.fromDto(dto)` (passing the whole preset DTO where only `durations` is expected) will now fail to typecheck. This task fixes only the type error minimally — the fuller rewire (goal auto-set, `activePreset` tracking) is Task 3's job. For this task, narrow to `.durations`:

```ts
  const applyPreset = useCallback(
    (presetId: BreathingPresetId) => {
      if (presetId === "custom") return;
      const preset = new ApplyPreset().execute(presetId);
      const next = BreathingSettings.fromDto(preset.durations);
      settingsRef.current = next;
      activePresetIdRef.current = presetId;
      setSettings(next);
      setActivePresetId(presetId);
      queueSettingsSave();
    },
    [queueSettingsSave],
  );
```

Delete the `recommend` callback entirely:

```ts
  const recommend = useCallback(() => {
    applyPreset(DEFAULT_PRESET_ID);
  }, [applyPreset]);
```

and remove `recommend` from the hook's returned object at the bottom (`return { ..., recommend, ... }` → drop `recommend,`).

- [ ] **Step 9: Grep for remaining `recommend` and `current-calm`/`box`/`triangle`/`relaxation-478`/`coherence` references outside test files being handled in Task 2c**

Run: `grep -rn "\.recommend(\|current-calm\|\"triangle\"\|relaxation-478\|\"coherence\"" src --include=*.ts --include=*.tsx | grep -v /test/`
Expected: no matches in non-test source (the old catalog ids and `recommend` only ever appeared in `use-breathing-engine.ts` and test files). If any turn up, fix them here; they belong to this task, not Task 2c.

- [ ] **Step 10: Typecheck (expect remaining errors confined to test files fixed in Task 2c)**

Run: `pnpm typecheck`
Expected: errors only in test files that assert the old catalog ids / `recommend` / old default durations (all owned by Task 2c). If any *non-test* file fails to typecheck, fix it now — this task must leave `src/**/*.{ts,tsx}` (excluding `src/test/**`) typechecking clean.

- [ ] **Step 11: Lint the non-test files touched**

Run: `pnpm exec eslint src/domain/breathing-preset.ts src/domain/breathing-settings.ts src/application/apply-preset.ts src/presentation/use-breathing-engine.ts`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add src/domain/breathing-preset.ts src/domain/breathing-settings.ts \
  src/application/apply-preset.ts src/presentation/use-breathing-engine.ts \
  src/test/domain/breathing-preset.test.ts src/test/application/apply-preset.test.ts
git commit -m "feat(domain,application): swap preset catalog to five protocols, DTO gains dosage/technique fields, drop recommend()"
```

---

## Task 2c: Test-fixture migration for the default-duration change (incl. the Triangle-default consequence)

**Files:**
- Modify: `src/test/domain/breathing-settings.test.ts` (re-add the default-value test with the new default)
- Modify: `src/test/domain/advance-breathing-state.test.ts`
- Modify: `src/test/domain/session-goal.test.ts`
- Modify: `src/test/presentation/view-model.test.ts`
- Modify: `src/test/presentation/breathing-stage.test.tsx`
- Modify: `src/test/presentation/session-snapshot.test.ts`
- Modify: `src/test/application/save-session.test.ts`
- Modify: `src/test/presentation/use-breathing-engine.test.ts`
- Modify: `src/test/presentation/breathe-app.test.tsx`
- Modify: `e2e/support/mock-breathing-api.ts` (widen `StoredSettings.goal`, export a shared legacy-default seed constant)
- Modify: `e2e/ramp.spec.ts`, `e2e/persistence.spec.ts`, `e2e/parity.spec.ts` (re-seed to the legacy 4-4-6-2 preferences so Square-geometry assertions keep testing the Square)
- Test: none new — this task is entirely fixture repair for tests broken by Task 2b's default-duration change.

**Interfaces:**
- Consumes: `BreathingSettings.default()` now returns `{ inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }` (Task 2b). `mockBreathingApi(page, initialStored)` (existing, unchanged signature) — this task adds a named export `LEGACY_SQUARE_PREFERENCES` for the shared 4-4-6-2 seed literal.
- Produces: every test file below compiles and asserts against either (a) an explicit local `BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 2 })` fixture (for pure engine/geometry tests that don't care about the *default* per se), or (b) the new Resonance default (for tests that specifically assert default/recommend/no-op-init behavior).

- [ ] **Step 1: Domain — `breathing-settings.test.ts`: re-add the default-value assertion against the new default**

Add back (this test was deleted in Task 1a Step 1 pending the default changing):

```ts
  it("defaults to the recommended Resonance Coherence pattern", () => {
    expect(BreathingSettings.default().toDto()).toEqual({
      inhale: 5.5,
      hold: 0,
      exhale: 5.5,
      rest: 0,
    });
  });
```

- [ ] **Step 2: Domain — `advance-breathing-state.test.ts` and `session-goal.test.ts`: pin a local fixture instead of the shared default**

Both files declare `const settings = BreathingSettings.default();` at module scope and rely on it being 4-4-6-2 for their phase-timing math (e.g. "captures inhale duration on the first advance" expects `first.phaseDurationSeconds` to be `4`). Change the module-scope declaration in each file:

`src/test/domain/advance-breathing-state.test.ts`:
```ts
const settings = BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 2 });
```

`src/test/domain/session-goal.test.ts`:
```ts
const settings = BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 2 });
```

No other line in either file changes — every assertion in both files was written against 4-4-6-2 timing and stays byte-identical once the fixture is pinned explicitly instead of implicitly via `.default()`.

- [ ] **Step 3: Presentation — `view-model.test.ts`, `breathing-stage.test.tsx`, `session-snapshot.test.ts`: same fixture-pinning fix**

`src/test/presentation/view-model.test.ts` — change:
```ts
const settings = BreathingSettings.default();
```
to:
```ts
const settings = BreathingSettings.fromDto({ inhale: 4, hold: 4, exhale: 6, rest: 2 });
```
No other change needed in this file (every assertion, e.g. `view.countdown` → `"4"`, `stepperValues` → `{ inhale: "4s", ... }`, was already written against 4-4-6-2 and stays correct once the fixture is explicit).

`src/test/presentation/breathing-stage.test.tsx` — same fix, same `const settings = ...` line near the top of the file.

`src/test/presentation/session-snapshot.test.ts` — the two `BreathingSettings.default()` call sites (`toBeNull()` test and, if present, any other bare `.default()` usage) don't depend on which duration set is default — `snapshotCompletedSession` only reads `cycleCount`/`totalElapsedSeconds`/`settings.toDto()` and passes them through unchanged, and the two direct-usage tests (`"returns null when no full cycle completed"`, and the explicit `BreathingSettings.fromDto({ inhale: 5, ... })` test) don't assert default values. **Leave `session-snapshot.test.ts` unchanged** — confirm by running it in Step 6; it should already be green.

- [ ] **Step 4: Application — `save-session.test.ts`: pin the fixture**

`src/test/application/save-session.test.ts` has `const settings = BreathingSettings.default();` used only to build a durations DTO for a `SaveSession.execute(...)` payload — the actual test assertions don't depend on the specific values (they check `cycleCount`/`elapsedSeconds` pass-through and the zero-cycle-skip behavior). Confirm by reading the file; if the assertions are values-agnostic, **no change needed** — verify in Step 6. If any assertion does hard-code `4, 4, 6, 2`, pin the same way as Step 2/3.

- [ ] **Step 5: Presentation — `use-breathing-engine.test.ts`: this is the file with the most default-duration-coupled tests; recompute intentionally per-test**

This file's tests that construct `useBreathingEngine()` **without** a `persistence` adapter get `BreathingSettings.default()` internally (now Resonance 5.5/0/5.5/0, `cycleSeconds() = 11`). Tests that **do** pass `persistence: fakePersistence(...)` are unaffected (that fixture already seeds `4, 4, 6, 2` explicitly and stays as-is). Walk each affected `it` block:

1. `"starts cycle 1 over RAF and pauses without drifting"` — no persistence adapter. `expect(result.current.view.countdown).toBe("3")` after 1s assumed a 4s inhale (`4 - 1 = 3`). With the new default inhale `5.5`, after 1s the countdown is `Math.ceil(5.5 - 1) = 5`. Update:
   ```ts
   expect(result.current.view.countdown).toBe("5");
   ```
   The second occurrence later in the same test (`await pause/resume` then `frames.flush(80_000)` then `expect(...countdown).toBe("3")` again) — that flush jumps 80s ahead from a resume with `lastFrameTimeMs: null`, so the delta is capped at 1s by `advanceBreathingState`'s `if (delta > 1) delta = 1;` rule; the countdown math is the same single-1s-tick case, so it also becomes `"5"`. Update both occurrences and the two `elapsed` assertions stay `"00:01"` (elapsed isn't duration-dependent).

2. `"clamps duration steppers and restores recommended 4-4-6-2"` — this test calls `result.current.recommend()`, which **no longer exists** (removed in Task 2b). Delete this test's `recommend()` half entirely and rename/rewrite it to test `applyPreset(DEFAULT_PRESET_ID)` instead, since that is now the equivalent operation:
   ```ts
   it("clamps duration steppers and restores the default Resonance Coherence protocol", () => {
     const { result } = renderHook(() => useBreathingEngine());

     act(() => {
       for (let i = 0; i < 20; i += 1) result.current.adjust("inhale", -1);
     });
     expect(result.current.view.stepperValues.inhale).toBe("2s");
     expect(result.current.view.countdown).toBe("2");
     expect(result.current.activePresetId).toBe("custom");

     act(() => {
       result.current.applyPreset("resonance-coherence");
     });
     expect(result.current.view.stepperValues).toEqual({
       inhale: "5.5s",
       hold: "0s",
       exhale: "5.5s",
       rest: "0s",
     });
     expect(result.current.activePresetId).toBe("resonance-coherence");
   });
   ```

3. `"applies presets and marks manual edits as custom"` — currently asserts `activePresetId` starts as `"current-calm"` and applies `"box"`. Update to the new ids:
   ```ts
   it("applies presets and marks manual edits as custom", () => {
     const { result } = renderHook(() => useBreathingEngine());

     expect(result.current.activePresetId).toBe("resonance-coherence");

     act(() => {
       result.current.applyPreset("executive-focus");
     });
     expect(result.current.activePresetId).toBe("executive-focus");
     expect(result.current.view.stepperValues).toEqual({
       inhale: "4s",
       hold: "4s",
       exhale: "4s",
       rest: "4s",
     });

     act(() => {
       result.current.adjust("inhale", 1);
     });
     expect(result.current.activePresetId).toBe("custom");
   });
   ```

4. `"debounces settings saves by 800 ms and persists recommended defaults"` — calls `result.current.recommend()`. Rename the final block to use `applyPreset(DEFAULT_PRESET_ID)`:
   ```ts
   it("debounces settings saves by 800 ms and persists default preset selection", () => {
     // ... unchanged setup and first assertions through the first saveSettings check ...

     act(() => {
       result.current.applyPreset("resonance-coherence");
     });
     act(() => {
       clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
     });
     expect(saveSettings).toHaveBeenLastCalledWith({
       durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
       goal: { kind: "cycles", cycles: 25 },
       ramp: null,
     });
   });
   ```
   Note the `goal` field now carries the auto-set dosage — this only becomes true once Task 3 wires goal auto-set into `applyPreset`; **leave this specific assertion as a TODO comment pointing at Task 3 for now, and instead assert only the `durations` field** in this task, deferring the `goal` assertion to Task 3's own test update (Task 3 Step re-touches this exact test to add the `goal` expectation once the wiring exists). Concretely, in *this* task write:
   ```ts
   expect(saveSettings).toHaveBeenLastCalledWith({
     durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
     goal: null,
     ramp: null,
   });
   ```
   (matching current, pre-Task-3 `applyPreset` behavior, which does not yet touch `goal`).

5. `"only plays tones after sound is enabled"` — no persistence adapter, calls `start()`/`reset()`/`start()` but only asserts `audio.playPhase` was called with `"inhale"` and a boolean — not duration-dependent. **No change needed**; verify in Step 6.

6. The `"useBreathingEngine ramp"` describe block's last test, `"shows the ramped exhale hint once Wind Down has stepped up"` — uses **no** persistence adapter, so it's driven by the new Resonance default (5.5/0/5.5/0, `cycleSeconds() = 11`), not the old 4-4-6-2 (`cycleSeconds() = 16`) the comment references. Wind Down lengthens `exhale` by 1s every 2 completed cycles, capped at +4s; base exhale is `5.5`. Recompute: cycle 0 spans `5.5+0+5.5+0=11s` (exhale is `5.5` still, step `floor(0/2)=0`), cycle 1 also `11s` (step `floor(1/2)=0`), cycle 2's exhale is base+`floor(2/2)=1` → `6.5s`. Total elapsed to reach the middle of cycle 2's exhale: `2 cycles × 11s + inhale(5.5) + hold(0) + a bit into exhale`. Rewrite:
   ```ts
   it("shows the ramped exhale hint once Wind Down has stepped up", () => {
     const frames = createRafStub();
     const { result } = renderHook(() =>
       useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio: silentAudio() }),
     );

     act(() => {
       result.current.setRamp("wind-down");
       result.current.start();
     });
     expect(result.current.activeRamp).toBe("wind-down");

     // Default Resonance Coherence cycle is 11s (5.5 inhale + 5.5 exhale, no
     // hold/rest); by cycle 3 (engine cycleCount 2)'s exhale, Wind Down has
     // stepped once (floor(2/2)=1), adding +1s to the 5.5s base exhale.
     completeCycles(frames, 28);

     expect(result.current.view.phase).toBe("exhale");
     expect(result.current.view.displayedDuration).toBe(6.5);
     expect(result.current.view.hint).toBe("Exhale now 6.5s");
   });
   ```
   Note `view.rampHint` is renamed `view.hint` here in anticipation of Task 4's rename — **do not** make this change yet in Task 2c if Task 4 hasn't landed; instead keep `rampHint` in this task and let Task 4 do a mechanical rename pass across every test file that references it. Revert the last line above to:
   ```ts
   expect(result.current.view.rampHint).toBe("Exhale now 6.5s");
   ```
   Determine the exact elapsed-seconds count for `completeCycles(frames, N)` empirically: run the test with an intentionally-wrong `N` first (Step 6 will surface the actual `displayedDuration`/`phase` via a failing assertion showing actual vs. expected), then adjust `N` until `phase === "exhale"` and `displayedDuration === 6.5`. Do the same empirical adjustment for `"holds a mid-session Ramp change..."` and `"shows no ramp hint after a manual mid-phase duration edit..."` tests in the same describe block if they use `completeCycles` with a hard-coded second count tied to the old 16s cycle — check each one against the new 11s cycle and adjust the second-count arguments so the assertions still land on the intended phase/cycle.

7. `"restores stored durations after initialize"`, `"keeps the exercise on 4-4-6-2 when initialize fails"`, `"loads a saved rest duration..."`, `"does not overwrite local edits..."`, `"flushes the latest pending settings save on unmount"`, `"debounces settings saves when selecting a ramp"`, `"restores stored ramp after initialize"`, `"does not persist a zero-cycle reset..."`, `"resets even when session save throws"`, `"auto-completes a cycle goal..."`, `"announces that a mid-session goal change applies..."` — **all of these pass an explicit `persistence: fakePersistence(...)` adapter whose `initialize()` returns `durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 }`**, so the hook's settings come from that mock, not from `BreathingSettings.default()`. These are **unaffected** by the default-duration change and need no edits. Rename only the *title* of `"keeps the exercise on 4-4-6-2 when initialize fails"` if desired for clarity (optional, not required for correctness) — its behavior (falling back to `BreathingSettings.default()` on `initialize()` throwing) now falls back to Resonance, not 4-4-6-2, so its **assertions must change**:
   ```ts
   it("keeps the exercise on the default Resonance Coherence pattern when initialize fails", async () => {
     // ... unchanged setup ...
     expect(result.current.view.stepperValues).toEqual({
       inhale: "5.5s",
       hold: "0s",
       exhale: "5.5s",
       rest: "0s",
     });
     // ... unchanged start()/showPause assertion ...
   });
   ```

- [ ] **Step 6: Run the full hook test file and iterate on empirically-derived values**

Run: `pnpm vitest run src/test/presentation/use-breathing-engine.test.ts`
Expected: FAIL initially on the ramp-timing tests where second-counts were guessed; read the actual `phase`/`displayedDuration`/`cycleCount` from the assertion failure output and correct the `completeCycles(frames, N)` arguments (per the empirical-adjustment note in Step 5.6) until the file is fully green.

- [ ] **Step 7: Presentation — `breathe-app.test.tsx`: update duration-dependent assertions**

Two spots reference the old default:
```ts
expect(container.querySelector("#inhaleValue")).toHaveTextContent("4s");
```
→
```ts
expect(container.querySelector("#inhaleValue")).toHaveTextContent("5.5s");
```
and the subsequent
```ts
await user.click(screen.getByLabelText("Increase inhale duration"));
expect(container.querySelector("#inhaleValue")).toHaveTextContent("5s");
```
→ (per Task 1a's snap rule, incrementing `5.5` snaps to `6`, not `5`)
```ts
await user.click(screen.getByLabelText("Increase inhale duration"));
expect(container.querySelector("#inhaleValue")).toHaveTextContent("6s");
```

And:
```ts
expect(status.textContent).toMatch(/4/);
```
→
```ts
expect(status.textContent).toMatch(/5\.5/);
```

Leave the tab-order test (`"asserts full tab order without positive tabindex"`) unchanged in this task — Task 3 adds the Preset Picker trigger to the header and must update that test's tab sequence itself (it currently asserts History is the second-to-focus header element right after the skip link; Task 3 needs to decide and test where the Protocols trigger sits in that order).

- [ ] **Step 8: Run the full app test file**

Run: `pnpm vitest run src/test/presentation/breathe-app.test.tsx`
Expected: PASS.

- [ ] **Step 9: e2e — widen `StoredSettings.goal` and add a shared legacy-default seed constant**

In `e2e/support/mock-breathing-api.ts`, change:
```ts
export type StoredSettings = {
  durations: { inhale: number; hold: number; exhale: number; rest: number };
  goal: string | null;
  ramp: string | null;
};
```
to:
```ts
export type StoredSettingsGoal =
  | null
  | { kind: "minutes"; minutes: number }
  | { kind: "cycles"; cycles: number };

export type StoredSettings = {
  durations: { inhale: number; hold: number; exhale: number; rest: number };
  goal: StoredSettingsGoal;
  ramp: string | null;
};

/** The pre-Protocol-Library default (4-4-6-2, Square geometry). Parity specs
 *  seed with this so they keep exercising Square geometry now that the app's
 *  own default preset (Resonance Coherence) renders the Triangle. */
export const LEGACY_SQUARE_PREFERENCES: StoredSettings = {
  durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
  goal: null,
  ramp: null,
};
```

(The type was already structurally `string | null` only because no spec had exercised a non-null goal through this mock yet; widening it is additive and doesn't break any existing caller since `null` still satisfies the new union.)

- [ ] **Step 10: e2e — re-seed every `parity.spec.ts` `describe` block with `LEGACY_SQUARE_PREFERENCES`**

In `e2e/parity.spec.ts`, add the import:
```ts
import { LEGACY_SQUARE_PREFERENCES, mockBreathingApi } from "./support/mock-breathing-api";
```

For **every** `test.describe(...)` block in the file (desktop, mobile, short-viewport-600, short-viewport-472, reduced-motion, and any others), add a `test.beforeEach` immediately after the `test.use({ viewport: ... })` line that seeds the mock and waits for a Square-only DOM signal before the test body's own `page.goto("/")` runs. Since `page.goto` already happens inside each test body, restructure to call `mockBreathingApi` first, inside a shared `beforeEach`:

```ts
test.describe("parity — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
  });

  test("renders square geometry, labels, and idle state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#side-rest")).toBeAttached();
    await expectSquareGeometry(page);
    // ... rest of test body unchanged ...
```

Add the same `test.beforeEach` block (with the same import) to every other `test.describe` in this file, and add `await expect(page.locator("#side-rest")).toBeAttached();` as the first assertion after `page.goto("/")` in each test that immediately measures geometry (`expectSquareGeometry`/`expectSquareAboveControls` calls) — this is the sync point that guards against measuring the DOM before the async settings fetch resolves and before React has committed the resulting Square markup.

- [ ] **Step 11: e2e — add one dedicated Triangle-default assertion that proves the real fallback path, not a mocked stand-in**

A test that seeds `mockBreathingApi` with `{ inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 }` and then asserts the Triangle renders only proves "if the settings fetch returns these values, the Triangle renders" — it does not prove that Resonance Coherence is genuinely the app's own compiled-in default. Prove the real fallback path instead: make the settings fetch fail (server error). `src/presentation/persistence.ts`'s `initialize()` (verify this in the actual file before implementing) catches a non-ok `/api/settings` response internally and resolves with `DEFAULT_PREFERENCES = BreathingPreferences.default().toDto()` rather than rejecting — the same `BreathingSettings.default()` value the hook's own `useState(BreathingSettings.default)` initial render already holds. Either way, forcing the fetch to fail routes the rendered durations through the app's real compiled-in default rather than through this test's own fixture data. Add to `e2e/parity.spec.ts`:

```ts
test.describe("parity — default protocol renders the Triangle", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("when the settings fetch fails, the app falls back to its own compiled-in default and renders the Triangle", async ({
    page,
  }) => {
    // No mockBreathingApi seed for GET /api/settings: force it to fail, so
    // the app is left on useBreathingEngine's own BreathingSettings.default()
    // initial state rather than any value this test hands it.
    await page.route("**/api/auth/anonymous", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ userId: "11111111-1111-4111-8111-111111111111" }),
      });
    });
    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 500, body: "settings unavailable" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
          goal: null,
          ramp: null,
        }),
      });
    });
    await page.route("**/api/sessions/history", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");

    // The fetch failure is async; wait for the Triangle's own base path
    // (only BreathingTriangle renders it) rather than racing the initial
    // (also-Square-shaped, before the failed fetch resolves) first paint.
    await expect(page.locator(".square-base")).toBeAttached({ timeout: 10_000 });
    await expect(page.locator("#side-rest")).toHaveCount(0);
    await expect(page.locator("#side-inhale")).toBeAttached();

    // Confirm it's specifically the Resonance Coherence default, not just
    // any rest:0 shape — open advanced options and read the steppers.
    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("5.5s");
    await expect(page.locator("#exhaleValue")).toHaveText("5.5s");
    await expect(page.getByRole("button", { name: "Protocol: Resonance Coherence" })).toBeVisible();
  });
});
```

(The final `"Protocol: Resonance Coherence"` assertion depends on Task 3's `PresetPicker` trigger label; if Task 2c is executed before Task 3 lands, drop that last assertion for now and add it back once `PresetPicker` exists — the geometry and stepper assertions above it are self-sufficient proof of the Triangle-default fallback on their own.)

- [ ] **Step 12: e2e — re-seed `ramp.spec.ts` and `persistence.spec.ts`**

Both files already call `mockBreathingApi(page, { durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 }, goal: null, ramp: null })` explicitly (visible in the earlier research read) — these are **already correctly seeded** and unaffected by the app's new default, since the mock always wins over the app's built-in default on load. Import `LEGACY_SQUARE_PREFERENCES` and replace the inline literal with it for consistency (optional but recommended — reduces duplicate literals):

In `e2e/ramp.spec.ts`'s `setupRampTest`:
```ts
import { LEGACY_SQUARE_PREFERENCES, mockBreathingApi, RAMP_GROUP_NAME, type RampLabel } from "./support/mock-breathing-api";
// ...
async function setupRampTest(page: Page) {
  await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
  // ...
```

In `e2e/persistence.spec.ts`, the two tests that seed `{ inhale: 4, hold: 4, exhale: 6, rest: 2 }` for the ramp-persistence test can use the same import; the first test (seeding `5, 2, 8, 3`) is intentionally a non-default fixture and stays as a literal.

- [ ] **Step 13: Run the full e2e suite for this task's scope**

Run: `pnpm test:e2e`
Expected: PASS across `smoke.spec.ts`, `parity.spec.ts`, `ramp.spec.ts`, `persistence.spec.ts`. (`pnpm dev` must be reachable per `playwright.config.ts`'s `webServer` block — Playwright starts it automatically if not already running.)

- [ ] **Step 14: Full verification for this task**

Run: `pnpm typecheck && pnpm exec eslint src e2e && pnpm test`
Expected: all green — every test file in `src/test/**` compiles and passes; the domain/application/infrastructure/presentation suites are all clean.

- [ ] **Step 15: Commit**

```bash
git add src/test/domain/breathing-settings.test.ts \
  src/test/domain/advance-breathing-state.test.ts \
  src/test/domain/session-goal.test.ts \
  src/test/presentation/view-model.test.ts \
  src/test/presentation/breathing-stage.test.tsx \
  src/test/presentation/use-breathing-engine.test.ts \
  src/test/presentation/breathe-app.test.tsx \
  e2e/support/mock-breathing-api.ts e2e/parity.spec.ts e2e/ramp.spec.ts e2e/persistence.spec.ts
git commit -m "test: migrate fixtures to the Resonance Coherence default, re-seed parity specs for Square geometry"
```

---

## Task 3: Preset Picker header disclosure, goal auto-set, goal chip

**Files:**
- Create: `src/presentation/preset-picker.tsx`
- Test: `src/test/presentation/preset-picker.test.tsx`
- Modify: `src/presentation/use-breathing-engine.ts` (goal auto-set on `applyPreset`, `commitGoal` split, `activePreset` derivation)
- Modify: `src/presentation/view-model.ts` (add `activePreset` param — plumbed through in this task, consumed by Task 4)
- Modify: `src/presentation/breathe-app.tsx` (mount `<PresetPicker>` beside `<HistoryPanel>`)
- Modify: `src/presentation/goal-picker.tsx` (render an extra pressed chip for an out-of-catalog goal value)
- Modify: `src/presentation/index.ts` (export `PresetPicker`)
- Modify: `src/app/globals.css` (`.preset-picker-*` overlay styles cloned from `.history-*`)
- Modify: `src/test/presentation/use-breathing-engine.test.ts` (add the `goal` assertion deferred from Task 2c Step 5.4; add goal-auto-set coverage)
- Modify: `src/test/presentation/breathe-app.test.tsx` (tab-order update for the new header trigger)
- Test: `e2e/protocols.spec.ts` (new file)

**Interfaces:**
- Consumes: `ApplyPreset` (Task 2b, returns `BreathingPresetDto`), `BREATHING_PRESET_CATALOG`/`findPresetById` (Task 2b), `presetToGoal` (Task 2b).
- Produces: `PresetPicker` component `{ activePresetId: BreathingPresetId; onSelect: (id: BreathingPresetId) => void }`; hook's `commitGoal(goal: SessionGoal, options?: { announce?: boolean }): void` (internal, not returned from the hook — `setGoal` remains the public API and now delegates to it); hook exposes `activePreset: BreathingPresetDto | null` (derived from `activePresetId` via `findPresetById`, `null` when `activePresetId === "custom"`).

- [ ] **Step 1: Write the failing `commitGoal`/goal-auto-set hook tests**

In `src/test/presentation/use-breathing-engine.test.ts`, first fix the assertion deferred from Task 2c (Step 5.4) to now expect the auto-set goal:

```ts
    act(() => {
      result.current.applyPreset("resonance-coherence");
    });
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
    });
    expect(saveSettings).toHaveBeenLastCalledWith({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
      goal: { kind: "cycles", cycles: 25 },
      ramp: null,
    });
```

Add new tests, in the `describe("useBreathingEngine persistence", ...)` block (goal auto-set touches persistence):

```ts
  it("applying a preset sets the Session Goal to its recommended cycle count", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      result.current.applyPreset("acute-de-stress");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 4 });
  });

  it("a fresh user's goal stays null until a preset is explicitly picked", () => {
    const { result } = renderHook(() => useBreathingEngine());
    expect(result.current.selectedGoal).toBeNull();
  });

  it("the Goal picker can still override the goal a preset auto-set", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      result.current.applyPreset("acute-de-stress");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 4 });

    act(() => {
      result.current.setGoal({ kind: "minutes", minutes: 10 });
    });
    expect(result.current.selectedGoal).toEqual({ kind: "minutes", minutes: 10 });
  });

  it("picking a protocol mid-session sets the goal silently, without the goal-change announcement", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
      }),
    );

    act(() => {
      result.current.start();
    });
    const announcementBeforePick = result.current.announcement;

    act(() => {
      result.current.applyPreset("acute-de-stress");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 4 });
    expect(result.current.announcement).toBe(announcementBeforePick);
    expect(result.current.announcement).not.toBe(
      "Goal will apply on your next session.",
    );
  });

  it("picking a protocol while paused also sets the goal silently, without the goal-change announcement", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
      }),
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.pause();
    });
    const announcementBeforePick = result.current.announcement;

    act(() => {
      result.current.applyPreset("mood-elevation");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 10 });
    expect(result.current.announcement).toBe(announcementBeforePick);
    expect(result.current.announcement).not.toBe(
      "Goal will apply on your next session.",
    );
  });

  it("picking a protocol while idle or completed sets the goal with no announcement to suppress", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
      }),
    );

    // Idle: commitGoal's announce:false path is exercised but has nothing to
    // suppress (the "will apply on your next session" message only fires
    // while running/paused) — assert the goal is still set correctly.
    act(() => {
      result.current.applyPreset("sleep-shift-478");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 4 });
    expect(result.current.announcement).not.toBe(
      "Goal will apply on your next session.",
    );

    // Completed: run a short cycle goal to completion, then pick another
    // protocol from the completed state.
    act(() => {
      result.current.setGoal({ kind: "cycles", cycles: 1 });
      result.current.start();
    });
    // Sleep Shift's cycle is 4 + 7 + 8 + 1 = 20s.
    for (let elapsed = 0; elapsed <= 20; elapsed += 1) {
      act(() => {
        frames.flush(elapsed * 1000);
      });
    }
    expect(result.current.engine.status).toBe("completed");

    act(() => {
      result.current.applyPreset("executive-focus");
    });
    expect(result.current.selectedGoal).toEqual({ kind: "cycles", cycles: 12 });
    expect(result.current.announcement).not.toBe(
      "Goal will apply on your next session.",
    );
  });

  it("exposes activePreset as the matched catalog DTO, or null for custom", () => {
    const { result } = renderHook(() => useBreathingEngine());

    expect(result.current.activePreset?.id).toBe("resonance-coherence");

    act(() => {
      result.current.adjust("inhale", 1);
    });
    expect(result.current.activePreset).toBeNull();

    act(() => {
      result.current.applyPreset("mood-elevation");
    });
    expect(result.current.activePreset?.id).toBe("mood-elevation");
    expect(result.current.activePreset?.alternateNostrils).toBe(true);
  });
```

- [ ] **Step 2: Run the hook tests to verify they fail**

Run: `pnpm vitest run src/test/presentation/use-breathing-engine.test.ts`
Expected: FAIL — `applyPreset` doesn't touch `selectedGoal`; `activePreset` is `undefined` on the returned object.

- [ ] **Step 3: Split `setGoal` into `commitGoal` + public `setGoal`, wire `applyPreset` to auto-set the goal silently, derive `activePreset`**

In `src/presentation/use-breathing-engine.ts`, add the import:

```ts
import {
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
  presetToGoal,
  type BreathingPresetDto,
  type BreathingPresetId,
} from "@/domain/breathing-preset";
```

Replace the existing `setGoal` callback with an internal `commitGoal` plus a thin public `setGoal`:

```ts
  const commitGoal = useCallback(
    (goal: SessionGoal, options: { announce?: boolean } = {}) => {
      const { announce = true } = options;
      const previous = selectedGoalRef.current;
      if (goalsMatch(previous, goal)) return;

      selectedGoalRef.current = goal;
      setSelectedGoal(goal);
      queueSettingsSave();

      if (!announce) return;
      const status = engineRef.current.status;
      if (status === "running" || status === "paused") {
        setAnnouncement("Goal will apply on your next session.");
      }
    },
    [goalsMatch, queueSettingsSave],
  );

  const setGoal = useCallback(
    (goal: SessionGoal) => {
      commitGoal(goal);
    },
    [commitGoal],
  );
```

Update `applyPreset` to also commit the preset's dosage as the goal, silently:

```ts
  const applyPreset = useCallback(
    (presetId: BreathingPresetId) => {
      if (presetId === "custom") return;
      const preset = new ApplyPreset().execute(presetId);
      const next = BreathingSettings.fromDto(preset.durations);
      settingsRef.current = next;
      activePresetIdRef.current = presetId;
      setSettings(next);
      setActivePresetId(presetId);
      commitGoal(presetToGoal(preset), { announce: false });
      queueSettingsSave();
    },
    [commitGoal, queueSettingsSave],
  );
```

(`queueSettingsSave` is still called explicitly after `commitGoal` because `commitGoal` itself also calls `queueSettingsSave()` — both calls are debounced onto the same timer via `queueSettingsSave`'s own cancel-and-reschedule logic, so the double call is harmless and matches the existing pattern where `setSettings`+`setGoal` used to each independently queue a save. Verify this produces exactly one `saveSettings` call per `applyPreset` invocation in Step 2's re-run, not two.)

Derive `activePreset` from `activePresetId` and add it to the returned object:

```ts
  const activePreset = useMemo<BreathingPresetDto | null>(
    () => (activePresetId === "custom" ? null : findPresetById(activePresetId)?.toDto() ?? null),
    [activePresetId],
  );
```

Place this `useMemo` near the existing `view` `useMemo`. Add `activePreset` to the hook's returned object (near `activePresetId`):

```ts
  return {
    engine,
    settings,
    activePresetId,
    activePreset,
    selectedGoal,
    // ... rest unchanged ...
```

- [ ] **Step 4: Run the hook tests to verify they pass**

Run: `pnpm vitest run src/test/presentation/use-breathing-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint the hook**

Run: `pnpm typecheck && pnpm exec eslint src/presentation/use-breathing-engine.ts`
Expected: no errors.

- [ ] **Step 6: Write the failing `PresetPicker` component test**

Create `src/test/presentation/preset-picker.test.tsx`:

```ts
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PresetPicker } from "@/presentation/preset-picker";

describe("PresetPicker", () => {
  it("is closed by default and shows the active protocol name on the trigger", () => {
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /Protocol: Resonance Coherence/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows 'Protocol: Custom' on the trigger when activePresetId is custom", () => {
    render(<PresetPicker activePresetId="custom" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Protocol: Custom/ })).toBeInTheDocument();
  });

  it("opens on click and lists all five protocols with dosage lines", async () => {
    const user = userEvent.setup();
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Protocol:/ }));

    const group = screen.getByRole("group", { name: "Protocol" });
    expect(group).toBeInTheDocument();
    expect(screen.getByText("Acute De-Stress")).toBeInTheDocument();
    expect(screen.getByText("Mood Elevation")).toBeInTheDocument();
    expect(screen.getByText("Resonance Coherence")).toBeInTheDocument();
    expect(screen.getByText("Sleep Shift (4-7-8)")).toBeInTheDocument();
    expect(screen.getByText("Executive Focus")).toBeInTheDocument();

    // Acute De-Stress: 4 cycles * (3+0+6+1)s / 60 = 40/60 ≈ 1 min
    expect(screen.getByText("4 cycles · ~1 min")).toBeInTheDocument();
  });

  it("marks the active preset card as pressed and calls onSelect for the clicked card", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Protocol:/ }));

    const resonanceCard = screen.getByRole("button", { name: /Resonance Coherence/, exact: false });
    expect(resonanceCard).toHaveAttribute("aria-pressed", "true");

    const boxCard = screen.getByRole("button", { name: /Executive Focus/, exact: false });
    expect(boxCard).toHaveAttribute("aria-pressed", "false");

    await user.click(boxCard);
    expect(onSelect).toHaveBeenCalledWith("executive-focus");
  });

  it("closes the overlay after a selection", async () => {
    const user = userEvent.setup();
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /Protocol:/ });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /Executive Focus/, exact: false }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows no pressed card and a Custom hint line when activePresetId is custom", async () => {
    const user = userEvent.setup();
    render(<PresetPicker activePresetId="custom" onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Protocol:/ }));

    for (const name of [
      "Acute De-Stress",
      "Mood Elevation",
      "Resonance Coherence",
      "Sleep Shift (4-7-8)",
      "Executive Focus",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(name), exact: false })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    expect(screen.getByText("Custom — adjust each phase")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /Protocol:/ });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(<PresetPicker activePresetId="resonance-coherence" onSelect={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /Protocol:/ });
    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

    await user.click(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 7: Run the component test to verify it fails**

Run: `pnpm vitest run src/test/presentation/preset-picker.test.tsx`
Expected: FAIL — `Cannot find module '@/presentation/preset-picker'`.

- [ ] **Step 8: Implement `src/presentation/preset-picker.tsx`**

Model on `history-panel.tsx`'s disclosure pattern (Escape/outside-click dismiss, focus restore) and `ramp-picker.tsx`'s `Button` usage:

```tsx
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  BREATHING_PRESET_CATALOG,
  type BreathingPresetId,
} from "@/domain/breathing-preset";
import { Button } from "@/components/ui/button";

const PRESET_PANEL_ID = "preset-panel";

type PresetPickerProps = {
  activePresetId: BreathingPresetId;
  onSelect: (id: BreathingPresetId) => void;
};

function triggerLabel(activePresetId: BreathingPresetId): string {
  if (activePresetId === "custom") return "Protocol: Custom";
  const preset = BREATHING_PRESET_CATALOG.find((p) => p.id === activePresetId);
  return `Protocol: ${preset?.name ?? "Custom"}`;
}

function dosageLine(recommendedCycles: number, cycleSeconds: number): string {
  const minutes = Math.round((recommendedCycles * cycleSeconds) / 60);
  return `${recommendedCycles} cycles · ~${minutes} min`;
}

export function PresetPicker({ activePresetId, onSelect }: PresetPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId().replace(/:/g, "");
  const panelDomId = `${PRESET_PANEL_ID}-${panelId}`;

  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    setOpen((current) => !current);
  }

  function select(id: BreathingPresetId) {
    onSelect(id);
    close();
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="preset-picker">
      <button
        ref={triggerRef}
        type="button"
        className="preset-toggle label-tier"
        aria-expanded={open}
        aria-controls={panelDomId}
        onClick={toggle}
      >
        {triggerLabel(activePresetId)}
      </button>
      <div
        id={panelDomId}
        ref={panelRef}
        className="preset-fields"
        hidden={!open}
        data-expanded={open ? "true" : undefined}
      >
        <div className="preset-options" role="group" aria-label="Protocol">
          {BREATHING_PRESET_CATALOG.map((preset) => {
            const pressed = activePresetId === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={pressed ? "breathePrimary" : "breatheSecondary"}
                size="breathe"
                className="preset-card"
                aria-pressed={pressed}
                onClick={() => select(preset.id)}
              >
                <span className="preset-card-name">{preset.name}</span>
                <span className="preset-card-description">{preset.description}</span>
                <span className="preset-card-dosage">
                  {dosageLine(preset.recommendedCycles, preset.durations.inhale + preset.durations.hold + preset.durations.exhale + preset.durations.rest)}
                </span>
              </Button>
            );
          })}
        </div>
        {activePresetId === "custom" ? (
          <p className="default-hint">Custom — adjust each phase.</p>
        ) : null}
      </div>
    </div>
  );
}
```

Note: `dosageLine` computes `cycleSeconds` inline from `preset.durations` rather than calling `BreathingSettings.fromDto(preset.durations).cycleSeconds()` — this keeps `preset-picker.tsx` from constructing a full `BreathingSettings` instance just to sum four numbers; both are equivalent since `preset.durations` is already validated. (If a reviewer prefers using the domain method for consistency with Task 1a's `cycleSeconds()`, that's an acceptable inline substitution — either is correct.)

- [ ] **Step 9: Run the component test to verify it passes**

Run: `pnpm vitest run src/test/presentation/preset-picker.test.tsx`
Expected: PASS.

- [ ] **Step 10: Export `PresetPicker` and mount it in `breathe-app.tsx`**

`src/presentation/index.ts` — add after the `RampPicker` export:
```ts
export { PresetPicker } from "./preset-picker";
```

`src/presentation/breathe-app.tsx` — import and mount beside `HistoryPanel` in `.app-header`:

```tsx
import { PresetPicker } from "./preset-picker";
```

```tsx
      <header className="app-header">
        <span className="mv-mark">
          <MarkIcon className="mv-mark-icon" strokeWidth={1.5} aria-hidden="true" />
          <span>Breathe</span>
        </span>
        <div className="app-header-actions">
          <PresetPicker
            activePresetId={engine.activePresetId}
            onSelect={engine.applyPreset}
          />
          <HistoryPanel sessionSavedRevision={sessionSavedRevision} />
        </div>
      </header>
```

Wrapping both triggers in a new `.app-header-actions` flex container (rather than making `HistoryPanel` a sibling of `PresetPicker` directly under `.app-header`) keeps the existing `.app-header .history-panel` / `.app-header .history-toggle` CSS selectors valid unchanged, and gives Task 3's CSS step a single flex row to lay both pill buttons out side by side.

- [ ] **Step 11: `.preset-picker-*` CSS cloned from `.history-*`, plus `.app-header-actions`**

In `src/app/globals.css`, add near the existing `/* History in header */` block:

```css
.app-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Protocol picker in header — cloned from .history-toggle / .history-fields */
.app-header .preset-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 1em;
  border: 1px solid rgb(232 240 235 / 0.14);
  border-radius: 999px;
  background: rgb(232 240 235 / 0.03);
  color: var(--mv-ink-dim);
  font: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-transform: none;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.app-header .preset-toggle:hover {
  color: var(--mv-ink);
  border-color: rgb(232 240 235 / 0.24);
}
.app-header .preset-toggle:focus-visible {
  outline: 2px solid var(--mv-teal);
  outline-offset: 3px;
}

.preset-picker {
  position: relative;
}
.preset-fields {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(100vw - 32px, 420px);
  max-block-size: min(70vh, 32rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 50;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: 0 16px 36px rgb(0 0 0 / 0.45);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preset-fields[hidden] {
  display: none;
}
.preset-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 0.7em 1em;
  border-radius: 12px;
  text-align: left;
}
.preset-card-name {
  font-size: 0.9rem;
  font-weight: 600;
}
.preset-card-description {
  font-size: 0.78rem;
  font-weight: 400;
  opacity: 0.82;
}
.preset-card-dosage {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

@media (max-width: 480px) {
  .preset-fields {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-inline: none;
    border-bottom: none;
    padding: 16px calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px));
    box-shadow: 0 -8px 32px rgb(0 0 0 / 0.5);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .preset-fields {
    background: var(--mv-panel);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

Add `.app-header .preset-toggle` to the existing `@media (prefers-reduced-motion: reduce)` block's transition-neutralizing list, alongside `.app-header .history-toggle`:

```css
  .app-header .history-toggle,
  .app-header .preset-toggle {
    transition: none !important;
  }
```

- [ ] **Step 12: Goal picker — render an extra pressed chip for an out-of-catalog goal value**

In `src/presentation/goal-picker.tsx`, add logic to detect when `selectedGoal` is a non-null value that doesn't match any `MINUTE_OPTIONS`/`CYCLE_OPTIONS` entry, and render one extra chip for it:

```tsx
export function GoalPicker({ selectedGoal, onSelect }: GoalPickerProps) {
  const isAutoSetValue =
    selectedGoal !== null &&
    selectedGoal.kind === "cycles" &&
    !CYCLE_OPTIONS.includes(selectedGoal.cycles as (typeof CYCLE_OPTIONS)[number]);

  return (
    <div className="goal-picker gap-0 py-[clamp(12px,2vh,16px)]">
      <span className="goal-picker-label label-tier">Session goal</span>
      <div className="goal-options" role="group" aria-label="Session goal">
        <Button
          type="button"
          variant={selectedGoal === null ? "breathePrimary" : "breatheSecondary"}
          size="breathe"
          aria-pressed={selectedGoal === null}
          onClick={() => onSelect(null)}
        >
          None
        </Button>
        {MINUTE_OPTIONS.map((minutes) => (
          <Button
            key={`minutes-${minutes}`}
            type="button"
            variant={
              isSelected(selectedGoal, "minutes", minutes)
                ? "breathePrimary"
                : "breatheSecondary"
            }
            size="breathe"
            aria-pressed={isSelected(selectedGoal, "minutes", minutes)}
            onClick={() => onSelect({ kind: "minutes", minutes })}
          >
            {minutes} min
          </Button>
        ))}
        {CYCLE_OPTIONS.map((cycles) => (
          <Button
            key={`cycles-${cycles}`}
            type="button"
            variant={
              isSelected(selectedGoal, "cycles", cycles)
                ? "breathePrimary"
                : "breatheSecondary"
            }
            size="breathe"
            aria-pressed={isSelected(selectedGoal, "cycles", cycles)}
            onClick={() => onSelect({ kind: "cycles", cycles })}
          >
            {cycles} cycles
          </Button>
        ))}
        {isAutoSetValue && selectedGoal?.kind === "cycles" ? (
          <Button
            type="button"
            variant="breathePrimary"
            size="breathe"
            aria-pressed="true"
            onClick={() => onSelect(selectedGoal)}
          >
            {selectedGoal.cycles} cycles
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

Note this reuses the exact `{n} cycles` label format as the catalog chips; if a protocol's `recommendedCycles` happens to coincide with an existing `CYCLE_OPTIONS` value (`5` or `10`), the existing chip naturally lights up and no extra chip is rendered — correct, since `mood-elevation`'s `10` matches `CYCLE_OPTIONS`'s `10` exactly by design coincidence; verify this doesn't produce a duplicate `10 cycles` button in Step 13's test.

- [ ] **Step 13: Add a `goal-picker` test for the auto-set chip**

In `src/test/presentation/breathe-app.test.tsx` or a focused new assertion — since there's no dedicated `goal-picker.test.ts` file in the current suite, add the coverage as an integration test in `breathe-app.test.tsx`:

```ts
  it("shows an extra pressed goal chip when a preset sets a non-catalog cycle count", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    // Resonance Coherence (default) recommends 25 cycles — not in CYCLE_OPTIONS (5, 10).
    // Selecting Acute De-Stress (4 cycles) also isn't in CYCLE_OPTIONS.
    const presetTrigger = screen.getByRole("button", { name: /Protocol:/ });
    await user.click(presetTrigger);
    await user.click(screen.getByRole("button", { name: /Acute De-Stress/, exact: false }));

    const goalGroup = screen.getByRole("group", { name: "Session goal" });
    const autoChip = within(goalGroup).getByRole("button", { name: "4 cycles" });
    expect(autoChip).toHaveAttribute("aria-pressed", "true");
  });

  it("mood-elevation's recommended 10 cycles lights up the existing catalog chip without duplicating it", async () => {
    const user = userEvent.setup();
    render(<BreatheApp />);

    const presetTrigger = screen.getByRole("button", { name: /Protocol:/ });
    await user.click(presetTrigger);
    await user.click(screen.getByRole("button", { name: /Mood Elevation/, exact: false }));

    const goalGroup = screen.getByRole("group", { name: "Session goal" });
    expect(within(goalGroup).getAllByRole("button", { name: "10 cycles" })).toHaveLength(1);
    expect(within(goalGroup).getByRole("button", { name: "10 cycles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
```

- [ ] **Step 14: Run and fix the goal-chip tests**

Run: `pnpm vitest run src/test/presentation/breathe-app.test.tsx`
Expected: PASS after Steps 11–12's implementation; iterate if the `isAutoSetValue`/dedup logic needs adjustment.

- [ ] **Step 15: Fix the tab-order test for the new header trigger**

The existing `"asserts full tab order without positive tabindex"` test in `breathe-app.test.tsx` currently expects: skip link → History button → Pause → Reset → Sound switch → 6 goal buttons → advanced-options toggle → 8 stepper buttons. With `PresetPicker`'s trigger now mounted before `HistoryPanel` inside `.app-header-actions` (DOM order: Protocol trigger, then History trigger), insert a new tab stop:

```ts
    // 2. Protocol disclosure button in header
    await user.tab();
    expect(screen.getByRole("button", { name: /Protocol:/ })).toHaveFocus();

    // 3. History disclosure button in header
    await user.tab();
    expect(screen.getByRole("button", { name: "History" })).toHaveFocus();

    // 4. Pause button (or Start/Resume)
    await user.tab();
    expect(screen.getByRole("button", { name: "Pause" })).toHaveFocus();
```

Renumber the remaining comments (`// 5. Reset button`, etc.) for readability; the actual assertions after this point are unchanged (still Reset, Sound, six goal buttons — noting the goal-chip test in Step 13 is a **separate** test that picks a preset first, so it doesn't interact with this tab-order test's default-state assumptions, since this test never opens the Preset Picker or selects a protocol).

- [ ] **Step 16: Run the full presentation suite**

Run: `pnpm vitest run src/test/presentation`
Expected: PASS.

- [ ] **Step 17: Write the `protocols.spec.ts` e2e spec**

Create `e2e/protocols.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { LEGACY_SQUARE_PREFERENCES, mockBreathingApi } from "./support/mock-breathing-api";

test.describe("protocol library", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("picking Acute De-Stress applies its durations and sets the goal chip and cycle stat", async ({
    page,
  }) => {
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
    await page.goto("/");

    await page.getByRole("button", { name: /Protocol:/ }).click();
    await page.getByRole("button", { name: /Acute De-Stress/, exact: false }).click();

    await page.getByRole("button", { name: "Show advanced options" }).click();
    await expect(page.locator("#inhaleValue")).toHaveText("3s");
    await expect(page.locator("#holdValue")).toHaveText("0s");
    await expect(page.locator("#exhaleValue")).toHaveText("6s");
    await expect(page.locator("#restValue")).toHaveText("1s");

    const goalGroup = page.getByRole("group", { name: "Session goal" });
    await expect(goalGroup.getByRole("button", { name: "4 cycles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Start", exact: true }).click();
    const cycleValue = page
      .locator(".mv-stat")
      .filter({ has: page.locator(".mv-stat-label", { hasText: "Cycle" }) })
      .locator(".mv-stat-value");
    await expect(cycleValue).toHaveText("1 / 4");
  });

  test("the picker trigger shows the active protocol name and updates after selection", async ({
    page,
  }) => {
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
    await page.goto("/");

    // Seeded with legacy 4-4-6-2, which matches no protocol, so it shows Custom.
    await expect(page.getByRole("button", { name: "Protocol: Custom" })).toBeVisible();

    await page.getByRole("button", { name: /Protocol:/ }).click();
    await page.getByRole("button", { name: /Executive Focus/, exact: false }).click();

    await expect(page.getByRole("button", { name: "Protocol: Executive Focus" })).toBeVisible();
  });

  test("the Goal picker can override a preset's auto-set goal", async ({ page }) => {
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
    await page.goto("/");

    await page.getByRole("button", { name: /Protocol:/ }).click();
    await page.getByRole("button", { name: /Sleep Shift/, exact: false }).click();

    const goalGroup = page.getByRole("group", { name: "Session goal" });
    await expect(goalGroup.getByRole("button", { name: "4 cycles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await goalGroup.getByRole("button", { name: "10 min" }).click();
    await expect(goalGroup.getByRole("button", { name: "10 min" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(goalGroup.getByRole("button", { name: "4 cycles" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
```

- [ ] **Step 18: Run the new e2e spec**

Run: `pnpm playwright test e2e/protocols.spec.ts`
Expected: PASS.

- [ ] **Step 19: Full verification for this task**

Run: `pnpm typecheck && pnpm exec eslint src e2e && pnpm test && pnpm test:e2e`
Expected: all green.

- [ ] **Step 20: Commit**

```bash
git add src/presentation/preset-picker.tsx src/test/presentation/preset-picker.test.tsx \
  src/presentation/use-breathing-engine.ts src/presentation/breathe-app.tsx \
  src/presentation/goal-picker.tsx src/presentation/index.ts src/app/globals.css \
  src/test/presentation/use-breathing-engine.test.ts src/test/presentation/breathe-app.test.tsx \
  e2e/protocols.spec.ts
git commit -m "feat(presentation): Preset Picker header disclosure, goal auto-set on preset selection"
```

---

## Task 4: Technique cues (hint merge, nostril hint, top-off cue: audio + announcement + Stage tick)

**Files:**
- Modify: `src/presentation/view-model.ts` (add `activePreset` param, merge `rampHint` + `techniqueHint` into `hint`, add `topOffFraction`, append nostril side to `announcement`)
- Modify: `src/presentation/use-breathing-engine.ts` (pass `activePreset` into `toBreathingViewModel`, fire the top-off audio cue + announcement + `pulseNonce` bump in the RAF loop)
- Modify: `src/presentation/audio.ts` (`playTopOff`)
- Modify: `src/presentation/breathing-stage.tsx` (render the top-off tick when `view.topOffFraction` is set)
- Modify: `src/presentation/breathe-app.tsx` (render `view.hint` in the renamed `.mv-hint` slot)
- Modify: `src/app/globals.css` (rename `.mv-ramp-hint` → `.mv-hint`; add `.square-topoff-tick`)
- Modify: `src/test/presentation/view-model.test.ts`, `src/test/presentation/audio.test.ts`, `src/test/presentation/breathing-stage.test.tsx`, `src/test/presentation/use-breathing-engine.test.ts` (the "ramp" describe block's `rampHint` → `hint` rename)
- Modify: `e2e/ramp.spec.ts` (`.mv-ramp-hint` locator → `.mv-hint`)
- Test: extend `e2e/protocols.spec.ts` with the sigh top-off e2e

**Interfaces:**
- Consumes: `crossedTopOff`, `inhaleTopOffBoundary`, `techniqueHint`, `nostrilFor` (Task 2a), `BreathingPresetDto` (Task 2b), `activePreset` (Task 3's hook derivation).
- Produces: `BreathingViewModel.hint: string | null` (replaces `rampHint` as the publicly consumed field; `formatRampHint`'s internal logic is preserved and still called, just merged), `BreathingViewModel.topOffFraction: number | null`, `BreathingAudio.playTopOff(soundEnabled: boolean): void`.

- [ ] **Step 1: Write the failing `view-model.ts` tests for `hint` and `topOffFraction`**

In `src/test/presentation/view-model.test.ts`, replace the existing `describe("rampHint", ...)` block's usages of `view.rampHint` with `view.hint` (mechanical rename — every existing assertion inside that block stays semantically the same, since with no `activePreset` passed, the technique half of the merge contributes nothing):

```ts
  describe("hint", () => {
    const rampedExhale = {
      ...startBreathing(createIdleBreathingState()),
      status: "running" as const,
      phaseIndex: 2,
      phaseElapsedSeconds: 1,
      totalElapsedSeconds: 30,
      cycleCount: 2,
      lastFrameTimeMs: 30_000,
      phaseDurationSeconds: 7,
    };

    it("names the phase and its ramped duration when a Ramp is active", () => {
      const view = toBreathingViewModel(rampedExhale, settings, null, "wind-down");
      expect(view.hint).toBe("Exhale now 7s");
    });

    it("names the lengthened inhale when Slow Down is active", () => {
      const rampedInhale = {
        ...rampedExhale,
        phaseIndex: 0,
        phaseDurationSeconds: 5,
      };
      const view = toBreathingViewModel(rampedInhale, settings, null, "slow-down");
      expect(view.hint).toBe("Inhale now 5s");
    });

    it("is null when idle", () => {
      const view = toBreathingViewModel(createIdleBreathingState(), settings, null, "wind-down");
      expect(view.hint).toBeNull();
    });

    it("is null when no Ramp or technique cue applies even if the displayed duration differs from base", () => {
      const view = toBreathingViewModel(rampedExhale, settings, null, null);
      expect(view.hint).toBeNull();
    });

    it("is null while a Ramp is active but the phase is still at its base duration", () => {
      const view = toBreathingViewModel(
        { ...rampedExhale, phaseDurationSeconds: 6 },
        settings,
        null,
        "wind-down",
      );
      expect(view.hint).toBeNull();
    });
  });

  describe("hint — technique cues", () => {
    const SIGH_PRESET = {
      id: "acute-de-stress" as const,
      name: "Acute De-Stress",
      description: "Physiological sigh.",
      durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
      recommendedCycles: 4,
      topOffSeconds: 1,
      alternateNostrils: false,
    };

    const NOSTRIL_PRESET = {
      id: "mood-elevation" as const,
      name: "Mood Elevation",
      description: "Nadi Shodhana.",
      durations: { inhale: 4, hold: 2, exhale: 6, rest: 1 },
      recommendedCycles: 10,
      topOffSeconds: null,
      alternateNostrils: true,
    };

    it("shows the top-off hint once the running inhale has crossed the boundary", () => {
      const runningPastBoundary = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 2.2,
        totalElapsedSeconds: 2.2,
        cycleCount: 0,
        lastFrameTimeMs: 2_200,
        phaseDurationSeconds: 3,
      };
      const view = toBreathingViewModel(
        runningPastBoundary,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.hint).toBe("Top-off breath");
    });

    it("shows the nostril hint on inhale, keyed to cycle parity", () => {
      const running = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 1,
        cycleCount: 1,
        lastFrameTimeMs: 1_000,
        phaseDurationSeconds: 4,
      };
      const view = toBreathingViewModel(
        running,
        BreathingSettings.fromDto({ inhale: 4, hold: 2, exhale: 6, rest: 1 }),
        null,
        null,
        NOSTRIL_PRESET,
      );
      expect(view.hint).toBe("Right nostril");
    });

    it("joins a ramp hint and a technique hint with a middle dot when both apply", () => {
      const running = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 2,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 30,
        cycleCount: 0,
        lastFrameTimeMs: 30_000,
        phaseDurationSeconds: 7,
      };
      const view = toBreathingViewModel(
        running,
        BreathingSettings.fromDto({ inhale: 4, hold: 2, exhale: 6, rest: 1 }),
        null,
        "wind-down",
        NOSTRIL_PRESET,
      );
      expect(view.hint).toBe("Exhale now 7s · Right nostril");
    });
  });

  describe("topOffFraction", () => {
    const SIGH_PRESET = {
      id: "acute-de-stress" as const,
      name: "Acute De-Stress",
      description: "Physiological sigh.",
      durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
      recommendedCycles: 4,
      topOffSeconds: 1,
      alternateNostrils: false,
    };

    it("is boundary / inhaleDuration when activePreset has a topOffSeconds", () => {
      const view = toBreathingViewModel(
        createIdleBreathingState(),
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      // boundary = 3 - 1 = 2; fraction = 2 / 3
      expect(view.topOffFraction).toBeCloseTo(2 / 3, 5);
    });

    it("is null when activePreset has no topOffSeconds", () => {
      const view = toBreathingViewModel(createIdleBreathingState(), settings);
      expect(view.topOffFraction).toBeNull();
    });

    it("tracks the live ramped inhale duration while running, not the base setting (ramp-safety)", () => {
      // Base inhale 3s, topOff 1s -> idle/base boundary would be 2 (fraction 2/3).
      // Mid-session, a Ramp has snapshotted a lengthened 5s inhale phase; the
      // Stage tick must move to match the same boundary the RAF loop's
      // crossedTopOff check uses (5 - 1 = 4, fraction 4/5), not stay at 2/3 —
      // otherwise the visible tick and the audio/announcement cue disagree.
      const rampedInhale = {
        ...startBreathing(createIdleBreathingState()),
        status: "running" as const,
        phaseIndex: 0,
        phaseElapsedSeconds: 1,
        totalElapsedSeconds: 1,
        cycleCount: 3,
        lastFrameTimeMs: 1_000,
        phaseDurationSeconds: 5,
      };
      const view = toBreathingViewModel(
        rampedInhale,
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        "slow-down",
        SIGH_PRESET,
      );
      expect(view.topOffFraction).toBeCloseTo(4 / 5, 5);
    });

    it("falls back to the base setting's inhale when idle even though a preset has topOffSeconds", () => {
      const view = toBreathingViewModel(
        createIdleBreathingState(),
        BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
        null,
        null,
        SIGH_PRESET,
      );
      expect(view.topOffFraction).toBeCloseTo(2 / 3, 5);
    });
  });
```

Also update the singular idle test at the top of the file (`"shows idle inhale labels, Start, zero stats, and pending sides"`) — it doesn't reference `rampHint`/`hint` today, so no change there; only the two `describe` blocks above are renamed/added.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/test/presentation/view-model.test.ts`
Expected: FAIL — `view.hint` is `undefined` (field doesn't exist yet), `toBreathingViewModel` doesn't accept a 5th `activePreset` argument.

- [ ] **Step 3: Implement the `hint`/`topOffFraction` changes in `view-model.ts`**

```ts
import type { BreathingSettings } from "@/domain/breathing-settings";
import type { BreathingPresetDto } from "@/domain/breathing-preset";
import type { BreathingEngineState } from "@/domain/breathing-engine";
import {
  countdownSeconds,
  currentPhase,
  formatElapsed,
  phaseProgress,
} from "@/domain/breathing-engine";
import { goalProgress, type SessionGoal } from "@/domain/session-goal";
import type { Ramp } from "@/domain/ramp";
import { inhaleTopOffBoundary, techniqueHint } from "@/domain/technique";
import {
  PHASE_LABELS,
  PHASES,
  sideStates,
  type Phase,
  type SideState,
} from "@/domain/phase";
import {
  interpolateTriangleDot,
  strokeDashoffset,
} from "./geometry";

export type SideView = {
  state: SideState;
  dashoffset: string;
};

export type BreathingViewModel = {
  phase: Phase;
  phaseEn: string;
  countdown: string;
  durationHint: string;
  cycleCount: string;
  elapsed: string;
  goalRemaining: string | null;
  hint: string | null;
  topOffFraction: number | null;
  primaryLabel: "Start" | "Resume";
  showPause: boolean;
  isCompleted: boolean;
  svgIdle: boolean;
  phaseClass: `phase-${Phase}`;
  sides: Record<Phase, SideView>;
  dot: { x: number; y: number };
  announcement: string;
  stepperValues: Record<Phase, string>;
  displayedDuration: number;
};

export function toBreathingViewModel(
  state: BreathingEngineState,
  settings: BreathingSettings,
  activeGoal: SessionGoal | null = null,
  activeRamp: Ramp = null,
  activePreset: BreathingPresetDto | null = null,
): BreathingViewModel {
  const phase = currentPhase(state);
  const displayedDuration = durationForDisplay(state, settings, phase);
  const progress =
    state.status === "idle"
      ? 0
      : phaseProgress(state.phaseElapsedSeconds, displayedDuration);
  const label = PHASE_LABELS[phase];
  const sides = sideStates(state.phaseIndex, state.status);
  const progressInfo = goalProgress(state, activeGoal);
  const triangleMode = settings.rest === 0;
  const dotPhase =
    triangleMode && phase === "rest" ? ("exhale" as const) : phase;
  const dotProgress =
    triangleMode && phase === "rest" ? 1 : progress;

  const rampHintText = formatRampHint(state, settings, phase, displayedDuration, activeRamp);
  const crossedBoundary = crossedTopOffForDisplay(state, activePreset);
  const techniqueHintText = techniqueHint(activePreset, phase, crossedBoundary, state.cycleCount);
  const hint = [rampHintText, techniqueHintText].filter((value) => value !== null).join(" · ") || null;
  const nostrilSide = activePreset ? techniqueHintText : null;

  return {
    phase,
    phaseEn: label,
    countdown: String(
      state.status === "idle"
        ? Math.ceil(settings.inhale)
        : countdownSeconds(state.phaseElapsedSeconds, displayedDuration),
    ),
    durationHint: formatDurationHint(displayedDuration),
    cycleCount: String(displayedCycleCount(state)),
    elapsed: formatElapsed(state.totalElapsedSeconds),
    goalRemaining: formatGoalRemaining(progressInfo),
    hint,
    topOffFraction: computeTopOffFraction(activePreset, settings, state),
    primaryLabel: state.status === "paused" ? "Resume" : "Start",
    showPause: state.status === "running",
    isCompleted: state.status === "completed",
    svgIdle: state.status === "idle",
    phaseClass: `phase-${phase}`,
    sides: {
      inhale: sideView(sides.inhale, progress),
      hold: sideView(sides.hold, progress),
      exhale: sideView(sides.exhale, progress),
      rest: sideView(sides.rest, progress),
    },
    dot: triangleMode
      ? interpolateTriangleDot(
          dotPhase === "rest" ? "exhale" : dotPhase,
          dotProgress,
        )
      : { x: 0, y: 0 },
    announcement: formatAnnouncement(label, displayedDuration, activePreset, phase, state.cycleCount),
    stepperValues: {
      inhale: `${settings.inhale}s`,
      hold: `${settings.hold}s`,
      exhale: `${settings.exhale}s`,
      rest: `${settings.rest}s`,
    },
    displayedDuration,
  };
}
```

`nostrilSide` above is an unused intermediate left in accidentally — remove it; `techniqueHintText` already carries "Left nostril"/"Right nostril" and is consumed directly by `formatAnnouncement`. Correct the block to drop that line and instead pass `techniqueHintText` into `formatAnnouncement`:

```ts
  const rampHintText = formatRampHint(state, settings, phase, displayedDuration, activeRamp);
  const crossedBoundary = crossedTopOffForDisplay(state, activePreset);
  const techniqueHintText = techniqueHint(activePreset, phase, crossedBoundary, state.cycleCount);
  const hint = [rampHintText, techniqueHintText].filter((value) => value !== null).join(" · ") || null;
```

and:

```ts
    announcement: formatAnnouncement(label, displayedDuration, techniqueHintText, phase),
```

Add the helper functions near the bottom of the file, after `formatRampHint`:

```ts
/**
 * Whether the *displayed* (idle-safe) inhale has crossed its top-off boundary.
 * Unlike the RAF-loop's `crossedTopOff` (which fires once, on the transition
 * frame, to trigger a cue), this is a level check used for one-shot view
 * rendering: "is the boundary already behind us, right now". idle/non-running
 * states never show it.
 */
function crossedTopOffForDisplay(
  state: BreathingEngineState,
  activePreset: BreathingPresetDto | null,
): boolean {
  if (activePreset === null || activePreset.topOffSeconds === null) return false;
  if (state.status !== "running" && state.status !== "paused") return false;
  const phase = currentPhase(state);
  if (phase !== "inhale") return false;
  const duration = state.phaseDurationSeconds ?? activePreset.durations.inhale;
  const boundary = inhaleTopOffBoundary(activePreset.topOffSeconds, duration);
  if (boundary === null) return false;
  return state.phaseElapsedSeconds >= boundary;
}

/**
 * Ramp-safe: while the phase is actively inhale and running/paused, uses the
 * live snapshotted `phaseDurationSeconds` (the same value the RAF loop's
 * `crossedTopOff` boundary is computed against) so the Stage tick and the
 * audio/announcement cue always agree on where the boundary is — including
 * mid-session under an active Ramp that has lengthened inhale. Falls back to
 * the base `settings.inhale` when idle/completed or when the phase isn't
 * inhale (the tick is drawn on the static inhale segment regardless of the
 * current phase, so it still needs a value even off-inhale).
 */
function computeTopOffFraction(
  activePreset: BreathingPresetDto | null,
  settings: BreathingSettings,
  state: BreathingEngineState,
): number | null {
  if (activePreset === null || activePreset.topOffSeconds === null) return null;
  const phase = currentPhase(state);
  const liveInhaleDuration =
    (state.status === "running" || state.status === "paused") &&
    phase === "inhale" &&
    state.phaseDurationSeconds !== null
      ? state.phaseDurationSeconds
      : settings.inhale;
  const boundary = inhaleTopOffBoundary(activePreset.topOffSeconds, liveInhaleDuration);
  if (boundary === null || liveInhaleDuration <= 0) return null;
  return boundary / liveInhaleDuration;
}

function formatAnnouncement(
  phaseLabel: string,
  displayedDuration: number,
  techniqueHintText: string | null,
  phase: Phase,
): string {
  const base = `${phaseLabel}. ${displayedDuration} seconds.`;
  if (techniqueHintText === "Left nostril") return `${base} Left nostril.`;
  if (techniqueHintText === "Right nostril") return `${base} Right nostril.`;
  return base;
}
```

Note `formatAnnouncement`'s `phase` parameter is unused in this minimal implementation (top-off's "Inhale again." announcement is handled separately, directly in the RAF loop in Task 4 Step 6 — not through this per-frame `announcement` field, since it must fire exactly once, mid-phase, decoupled from the phase-boundary `cuePhase` calls that produce this `announcement` string). Remove the unused `phase` parameter to keep the function signature clean:

```ts
function formatAnnouncement(
  phaseLabel: string,
  displayedDuration: number,
  techniqueHintText: string | null,
): string {
  const base = `${phaseLabel}. ${displayedDuration} seconds.`;
  if (techniqueHintText === "Left nostril") return `${base} Left nostril.`;
  if (techniqueHintText === "Right nostril") return `${base} Right nostril.`;
  return base;
}
```

and correspondingly:

```ts
    announcement: formatAnnouncement(label, displayedDuration, techniqueHintText),
```

- [ ] **Step 4: Run the view-model tests to verify they pass**

Run: `pnpm vitest run src/test/presentation/view-model.test.ts`
Expected: PASS. Also re-verify the pre-existing idle announcement test still holds: `"INHALE. 4 seconds."` — with `techniqueHintText` null (no `activePreset` passed), `formatAnnouncement` returns exactly the base string, unchanged.

- [ ] **Step 5: `audio.ts` — add `playTopOff`**

Write the failing test first, in `src/test/presentation/audio.test.ts`, appended after the existing `"plays a rising completion chime..."` test:

```ts
  it("plays a rising top-off tone (330→523 over 0.25s) when sound is on", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playTopOff(true);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(330, 10);
    expect(oscillators[0]?.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(523, 10.25);
  });

  it("stays silent for top-off when sound is disabled", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playTopOff(false);
    expect(oscillators).toHaveLength(0);
  });
```

Run: `pnpm vitest run src/test/presentation/audio.test.ts`
Expected: FAIL — `audio.playTopOff is not a function`.

Implement in `src/presentation/audio.ts`, adding `playTopOff` next to `playCompletion` and exposing it on the returned object:

```ts
  function playTopOff(soundEnabled: boolean) {
    if (!soundEnabled || !ctx) return;
    playTone(330, 523, 0.25, 0);
  }

  return {
    ensure,
    playPhase,
    playCompletion,
    playTopOff,
    get context() {
      return ctx;
    },
  };
```

Run: `pnpm vitest run src/test/presentation/audio.test.ts`
Expected: PASS.

**Ripple warning for the next two steps:** `playTopOff` is now a required member of `BreathingAudio` (the return type of `createBreathingAudio`, used as `BreathingEngineAdapters["audio"]`'s type). Every inline `audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null }`-shaped object literal in `src/test/presentation/use-breathing-engine.test.ts` (nine call sites, confirmed by `grep -n "playCompletion" src/test/presentation/use-breathing-engine.test.ts` — all in this one file, including the module-scope `silentAudio` helper) now fails to typecheck with "Property 'playTopOff' is missing" until `playTopOff: vi.fn()` is added to each. Fix all nine as part of Step 8 below (the step that already touches this file for the `hint` rename) — do not leave the file red between Step 6 and Step 8.

- [ ] **Step 6: Wire the top-off cue into the RAF loop in `use-breathing-engine.ts`**

Import `crossedTopOff` and `inhaleTopOffBoundary` from `@/domain/technique`. In the RAF `loop` function (inside the `useEffect` that watches `engine.status === "running"`), after computing `next` and before the `if (next.status === "completed")` check, add the top-off cue check. It must fire once, using the previous and next phase-elapsed values, gated to the inhale phase and to the phase not having changed on this frame (a phase transition frame is handled by `cuePhase`, not this cue):

```ts
    const loop = (now: number) => {
      if (cancelled) return;
      const previous = engineRef.current;
      const next = advanceBreathingState(
        previous,
        now,
        settingsRef.current,
        activeGoalRef.current,
        activeRampRef.current,
      );
      engineRef.current = next;
      setEngine(next);
      if (next.status === "completed") {
        handleCompletion(next);
        return;
      }
      if (next.phaseIndex !== previous.phaseIndex) {
        cuePhase(next);
      } else if (
        next.phaseIndex === previous.phaseIndex &&
        currentPhase(next) === "inhale"
      ) {
        const preset = activePresetIdRef.current === "custom"
          ? null
          : findPresetById(activePresetIdRef.current);
        if (preset && preset.topOffSeconds !== null) {
          const boundary = inhaleTopOffBoundary(
            preset.topOffSeconds,
            next.phaseDurationSeconds ?? preset.durations.inhale,
          );
          if (crossedTopOff(previous.phaseElapsedSeconds, next.phaseElapsedSeconds, boundary)) {
            audioRef.current.playTopOff(soundRef.current);
            setAnnouncement("Inhale again.");
            setPulseNonce((nonce) => nonce + 1);
          }
        }
      }
      frameId = rafRef.current(loop);
    };
```

Add the `currentPhase` import from `@/domain/breathing-engine` (check the existing import list at the top of the file — `currentPhase` is exported from `breathing-engine.ts` per `src/domain/index.ts`'s re-export list; add it to the existing `import { advanceBreathingState, createIdleBreathingState, pauseBreathing, resetBreathing, startBreathing, type BreathingEngineState } from "@/domain/breathing-engine";` line) and `findPresetById`, `crossedTopOff`, `inhaleTopOffBoundary` to the file's imports:

```ts
import {
  advanceBreathingState,
  createIdleBreathingState,
  currentPhase,
  pauseBreathing,
  resetBreathing,
  startBreathing,
  type BreathingEngineState,
} from "@/domain/breathing-engine";
import { crossedTopOff, inhaleTopOffBoundary } from "@/domain/technique";
```

(`findPresetById` is already imported from Task 3's Step 3 addition.)

Update the `view` `useMemo` and every other `toBreathingViewModel(...)` call site in this file to pass `activePreset` as the 5th argument:

```ts
  const view = useMemo(
    () => toBreathingViewModel(engine, settings, activeGoal, activeRamp, activePreset),
    [engine, settings, activeGoal, activeRamp, activePreset],
  );
```

Also update the `cuePhase` callback, which internally calls `toBreathingViewModel` to compute the announcement for a phase-boundary transition — it must also pass the active preset so nostril-side announcements are correct on the entry frame:

```ts
  const cuePhase = useCallback((state: BreathingEngineState) => {
    const preset = activePresetIdRef.current === "custom"
      ? null
      : findPresetById(activePresetIdRef.current)?.toDto() ?? null;
    const view = toBreathingViewModel(
      state,
      settingsRef.current,
      activeGoalRef.current,
      activeRampRef.current,
      preset,
    );
    audioRef.current.playPhase(view.phase, soundRef.current);
    setAnnouncement(view.announcement);
    setPulseNonce((nonce) => nonce + 1);
  }, []);
```

- [ ] **Step 7: Write ramp-safety and pause/resume-around-boundary tests for the top-off cue**

Two scenarios the RAF-loop wiring must get right have no test yet: (a) a top-off preset under an active Ramp that lengthens inhale — the cue must fire at the *ramped* boundary, matching Task 4 Step 1's `topOffFraction` ramp-safety test on the view-model side; (b) pausing and resuming exactly around the boundary must not cause the cue to fire twice (once before pause, once again on the first frame after resume, if the boundary check were naively re-evaluated against a reset `phaseElapsedSeconds` baseline). Add both to the `describe("useBreathingEngine ramp", ...)` block (or a new adjacent `describe("useBreathingEngine top-off cue", ...)` block — either location is fine, keep top-off cue tests grouped together) in `src/test/presentation/use-breathing-engine.test.ts`:

```ts
describe("useBreathingEngine top-off cue", () => {
  const silentAudioWithSpies = () => ({
    ensure: vi.fn(),
    playPhase: vi.fn(),
    playCompletion: vi.fn(),
    playTopOff: vi.fn(),
    context: null,
  });

  it("fires the top-off cue at the ramped boundary, not the base boundary, when Slow Down has lengthened inhale", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("acute-de-stress"); // inhale 3s, topOff 1s -> base boundary 2s
      result.current.setRamp("slow-down"); // lengthens inhale +1s every 3 cycles, capped +3s
      result.current.start();
    });

    // Acute De-Stress cycle is 3+0+6+1=10s. By cycle 3 (engine cycleCount 3),
    // Slow Down has stepped once (floor(3/3)=1), making inhale 4s and the
    // ramped boundary 4-1=3s (not the base 2s).
    act(() => {
      frames.flush(0);
    });
    for (let elapsed = 1; elapsed <= 32; elapsed += 1) {
      act(() => {
        frames.flush(elapsed * 1000);
      });
    }
    expect(result.current.view.phase).toBe("inhale");
    expect(result.current.view.displayedDuration).toBe(4);
    // If the cue fired at the base 2s boundary instead of the ramped 3s
    // boundary, playTopOff would already have been called before this point
    // in the loop; asserting it fired exactly once proves it fired once, at
    // the (ramped) boundary the loop actually crossed.
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);
    expect(audio.playTopOff).toHaveBeenCalledWith(false);
  });

  it("does not double-fire the top-off cue across a pause/resume that straddles the boundary", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("acute-de-stress"); // inhale 3s, topOff 1s -> boundary 2s
      result.current.start();
    });

    // Advance to 1.5s into inhale (before the 2s boundary), then pause.
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_500);
    });
    expect(result.current.view.phase).toBe("inhale");
    expect(audio.playTopOff).not.toHaveBeenCalled();

    act(() => {
      result.current.pause();
    });
    expect(audio.playTopOff).not.toHaveBeenCalled();

    // Resume: pauseBreathing/startBreathing preserve phaseElapsedSeconds, so
    // the next frame continues from 1.5s, not from 0 — the boundary crossing
    // must still be detected exactly once on the frame that carries elapsed
    // past 2s, not re-triggered by the resume itself.
    act(() => {
      result.current.start();
    });
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_000); // +1s of running time -> phaseElapsedSeconds ~2.5s, past the 2s boundary
    });

    expect(audio.playTopOff).toHaveBeenCalledTimes(1);

    // One more frame well past the boundary must not fire it again.
    act(() => {
      frames.flush(2_000);
    });
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);
  });
});
```

Note: these two new tests build their own `silentAudioWithSpies()` fixture with `playTopOff` already included, so they typecheck on their own. The file's *other*, pre-existing audio fixtures still lack `playTopOff` at this point (see the ripple warning after Step 5) — that cleanup is Step 8's job, done together with the `hint` rename since both touch this same file; don't fix it here to avoid a diff conflict between the two steps.

- [ ] **Step 8: Update the ramp-hint tests in `use-breathing-engine.test.ts` for the `hint` rename**

The `"useBreathingEngine ramp"` describe block's tests reference `result.current.view.rampHint`. Rename each occurrence to `result.current.view.hint` (mechanical — none of these tests pass an `activePresetId` that resolves to a technique-cue preset, so the merge contributes nothing extra and the expected string values are unchanged):

```ts
  it("shows no ramp hint while idle", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      result.current.setRamp("wind-down");
    });

    expect(result.current.view.hint).toBeNull();
  });
```

(repeat for the other three tests in that block: `"shows no ramp hint after a manual mid-phase duration edit..."` and `"shows the ramped exhale hint once Wind Down has stepped up"` — the latter was already updated to expect `view.rampHint` in Task 2c Step 5.6; revisit it here and rename to `view.hint`, keeping the `"Exhale now 6.5s"` value unchanged since the default preset id at that point in the test, `resonance-coherence`, has no `topOffSeconds`/`alternateNostrils`.)

**Also in this step:** add `playTopOff: vi.fn()` to every inline audio fixture object literal in this file (the ripple flagged after Step 5) — the module-scope `silentAudio` helper inside the `"useBreathingEngine ramp"` describe block, and every other `audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null }`-shaped literal elsewhere in the file (confirm the full list with `grep -n "playCompletion" src/test/presentation/use-breathing-engine.test.ts` — nine sites as of Task 2c/3). This must land before `pnpm typecheck` is clean again for this file.

- [ ] **Step 9: Run the hook test file (including the new ramp-safety and pause/resume tests)**

Run: `pnpm vitest run src/test/presentation/use-breathing-engine.test.ts`
Expected: PASS.

- [ ] **Step 10: `breathing-stage.tsx` — render the top-off tick**

Add the failing test first, in `src/test/presentation/breathing-stage.test.tsx`, appended after the existing dot-position tests:

```ts
  it("renders a top-off tick on the inhale segment when view.topOffFraction is set", () => {
    const view = toBreathingViewModel(
      createIdleBreathingState(),
      BreathingSettings.fromDto({ inhale: 3, hold: 0, exhale: 6, rest: 1 }),
      null,
      null,
      {
        id: "acute-de-stress",
        name: "Acute De-Stress",
        description: "Physiological sigh.",
        durations: { inhale: 3, hold: 0, exhale: 6, rest: 1 },
        recommendedCycles: 4,
        topOffSeconds: 1,
        alternateNostrils: false,
      },
    );
    const { container } = render(<BreathingStage view={view} />);

    const tick = container.querySelector(".square-topoff-tick");
    expect(tick).not.toBeNull();
    expect(tick).toHaveAttribute("aria-hidden", "true");

    const expectedPoint = pointOnRoundedSegment("inhale", 2 / 3, INSET, RADIUS);
    expect(Number(tick?.getAttribute("cx"))).toBeCloseTo(expectedPoint.x, 5);
    expect(Number(tick?.getAttribute("cy"))).toBeCloseTo(expectedPoint.y, 5);
  });

  it("renders no top-off tick when view.topOffFraction is null", () => {
    const view = toBreathingViewModel(createIdleBreathingState(), settings);
    const { container } = render(<BreathingStage view={view} />);
    expect(container.querySelector(".square-topoff-tick")).toBeNull();
  });
```

Run: `pnpm vitest run src/test/presentation/breathing-stage.test.tsx`
Expected: FAIL — no `.square-topoff-tick` rendered.

Implement in `src/presentation/breathing-stage.tsx`:

```tsx
export function BreathingStage({ view }: { view: BreathingViewModel }) {
  const rawProgress = 1 - Number(view.sides[view.phase].dashoffset);
  const progress = Math.min(
    1,
    Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0),
  );

  const { x, y } = view.svgIdle
    ? pointOnRoundedSegment("inhale", 0, INSET, RADIUS)
    : pointOnRoundedSegment(view.phase, progress, INSET, RADIUS);

  const topOffTick =
    view.topOffFraction === null
      ? null
      : pointOnRoundedSegment("inhale", view.topOffFraction, INSET, RADIUS);

  return (
    <div className="square-wrap">
      <svg
        className={cn("square-svg", view.svgIdle && "idle")}
        viewBox={SQUARE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <path className="square-frame-border" d={BORDER_PATH} fill="none" />
        {PHASES.map((phase) => {
          const side = view.sides[phase];
          return (
            <path
              key={phase}
              id={`side-${phase}`}
              className={cn("square-side", side.state)}
              data-phase={phase}
              pathLength={1}
              d={SEGMENTS[phase]}
              style={{ strokeDashoffset: side.dashoffset }}
            />
          );
        })}
        {topOffTick ? (
          <circle
            className="square-topoff-tick"
            aria-hidden="true"
            r={3}
            cx={topOffTick.x}
            cy={topOffTick.y}
          />
        ) : null}
        <circle
          id="progressDot"
          className="progress-dot"
          r={DOT_RADIUS}
          cx={x}
          cy={y}
        />
      </svg>
    </div>
  );
}
```

Run: `pnpm vitest run src/test/presentation/breathing-stage.test.tsx`
Expected: PASS.

- [ ] **Step 11: `breathe-app.tsx` — render `view.hint` in the renamed slot**

```tsx
              {view.hint ? (
                <span className="mv-hint">{view.hint}</span>
              ) : null}
```

(replacing the existing `view.rampHint` / `.mv-ramp-hint` block).

- [ ] **Step 12: CSS — rename `.mv-ramp-hint` → `.mv-hint`, add `.square-topoff-tick`**

In `src/app/globals.css`, rename the selector (keep the rule body identical):

```css
.mv-hint {
  font-size: clamp(0.68rem, 2cqmin, 0.8rem);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mv-ink-faint);
}
```

Add, near `.progress-dot`'s rule block:

```css
.mv-square-frame .square-topoff-tick {
  fill: var(--mv-dot);
  opacity: 0.6;
}
```

Add `.square-topoff-tick` to the existing reduced-motion neutralization if it has any transition (it has none in this minimal implementation, so no reduced-motion rule is required — verify no `transition` property was added to it).

- [ ] **Step 13: Update `e2e/ramp.spec.ts`'s `.mv-ramp-hint` locators**

`e2e/ramp.spec.ts` has two `.mv-ramp-hint` locator usages (the "Exhale now 3s" assertion and the transition-check `getComputedStyle` call). Rename both to `.mv-hint`:

```ts
    await expect(page.locator(".mv-hint")).toHaveText("Exhale now 3s");
```
and
```ts
    const hintTransition = await page
      .locator(".mv-hint")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
```

- [ ] **Step 14: Run the ramp e2e spec**

Run: `pnpm playwright test e2e/ramp.spec.ts`
Expected: PASS.

- [ ] **Step 15: Add the sigh top-off e2e to `e2e/protocols.spec.ts`**

Append a new test:

```ts
  test("Acute De-Stress plays the top-off cue, shows the hint and Stage tick, and completes at 4 cycles", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
    await page.goto("/");

    const soundSwitch = page.getByRole("switch", { name: "Sound" });
    await soundSwitch.click();

    await page.getByRole("button", { name: /Protocol:/ }).click();
    await page.getByRole("button", { name: /Acute De-Stress/, exact: false }).click();

    await page.getByRole("button", { name: "Start", exact: true }).click();

    // Boundary = inhale(3) - topOff(1) = 2s into the inhale phase.
    await expect(page.locator(".mv-hint")).toHaveText("Top-off breath", {
      timeout: 4_000,
    });
    await expect(page.locator(".square-topoff-tick")).toBeAttached();
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
    ).toHaveText("Inhale again.");

    const cycleValue = page
      .locator(".mv-stat")
      .filter({ has: page.locator(".mv-stat-label", { hasText: "Cycle" }) })
      .locator(".mv-stat-value");
    // 4 cycles at (3+0+6+1)=10s each; goal is 4 cycles (auto-set), so the
    // session auto-completes.
    await expect(page.getByText("Session complete.")).toBeVisible({ timeout: 45_000 });
    await expect(cycleValue).toHaveText("4 / 4");
  });
```

- [ ] **Step 16: Run the full `protocols.spec.ts` file**

Run: `pnpm playwright test e2e/protocols.spec.ts`
Expected: PASS. If the top-off hint timing assertion is flaky (RAF-driven real-time test), loosen the `timeout` rather than the assertion itself — do not weaken to a non-deterministic check.

- [ ] **Step 17: Full verification for this task**

Run: `pnpm typecheck && pnpm exec eslint src e2e && pnpm test && pnpm test:e2e`
Expected: all green.

- [ ] **Step 18: Layout-budget re-check with a technique-cue preset active**

Add one more scenario to `e2e/parity.spec.ts`'s layout-budget coverage, per the spec's verification requirement ("additionally with Mood Elevation + Slow Down active while running — hint line present"):

```ts
test.describe("parity — protocol + ramp layout budget", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Mood Elevation with Slow Down active while running keeps the square above the deck", async ({
    page,
  }) => {
    await mockBreathingApi(page, LEGACY_SQUARE_PREFERENCES);
    await page.goto("/");

    await page.getByRole("button", { name: /Protocol:/ }).click();
    await page.getByRole("button", { name: /Mood Elevation/, exact: false }).click();

    await page.getByRole("button", { name: "Show advanced options" }).click();
    await page.getByRole("button", { name: "Slow down" }).click();

    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator("#side-inhale")).toHaveClass(/active/);
    await expectSquareAboveControls(page);
  });
});
```

Run: `pnpm playwright test e2e/parity.spec.ts`
Expected: PASS.

- [ ] **Step 19: Commit**

```bash
git add src/presentation/view-model.ts src/presentation/use-breathing-engine.ts \
  src/presentation/audio.ts src/presentation/breathing-stage.tsx src/presentation/breathe-app.tsx \
  src/app/globals.css \
  src/test/presentation/view-model.test.ts src/test/presentation/audio.test.ts \
  src/test/presentation/breathing-stage.test.tsx src/test/presentation/use-breathing-engine.test.ts \
  e2e/ramp.spec.ts e2e/protocols.spec.ts e2e/parity.spec.ts
git commit -m "feat(presentation): technique cues — merged hint slot, nostril hint, top-off audio/announcement/Stage tick"
```

---

## Task 5: Docs, parity-contract, issue close-out

**Files:**
- Modify: `CONTEXT.md`
- Modify: `docs/parity-contract.md`
- No code changes.

- [ ] **Step 1: Update `CONTEXT.md`'s Preset glossary entry**

Replace the **Preset** entry's example list and add two new glossary terms:

```markdown
**Preset**:
A named set of phase durations a user can select as a starting point (Acute De-Stress, Mood Elevation, Resonance Coherence, Sleep Shift (4-7-8), Executive Focus), or Custom once durations are hand-adjusted. Each carries a Dosage (recommended cycle count) and may carry a Top-off or Nostril cue. The picker is titled "Protocols" in the UI, but "Preset" remains the domain term — do not introduce "Protocol" as a second glossary synonym.
_Avoid_: Pattern, breathing pattern.
```

Add, alphabetically ordered with the existing terms (after **Session Goal**, before **Streak**, or wherever alphabetical/logical placement in the existing file's ordering fits — match the existing file's ordering convention):

```markdown
**Top-off**:
The second, shorter inhale segment of a preset with a physiological-sigh technique (e.g. Acute De-Stress: a 3s inhale followed by a 1s top-off before exhaling). Cued by a short rising tone, an "Inhale again." announcement, and a tick mark on the Stage's inhale side at the boundary between the two segments.
_Avoid_: Double inhale, second breath.

**Nostril cue**:
The per-cycle "Left nostril" / "Right nostril" hint a preset with alternate-nostril technique (e.g. Mood Elevation) shows during inhale and exhale, alternating which side leads each completed cycle.
_Avoid_: Alternate breathing, nadi cue.

**Dosage**:
A Preset's recommended cycle count. Selecting a Preset applies its Dosage as the Session Goal (a `{ kind: "cycles" }` goal); the Goal picker can still override it afterward. A fresh, unpicked session has no Session Goal.
```

- [ ] **Step 2: Update `docs/parity-contract.md`'s pinned rows**

Update the following existing rows in place:

```markdown
| Default pattern Resonance Coherence 5.5/0/5.5/0 seconds | A |
```
(replacing `| Default pattern 4-4-6-2 seconds | A |`)

```markdown
| Duration validation (`PHASE_DURATION_LIMITS`) allows inhale/exhale 2–15 and hold/rest **0–15**, in 0.5s steps; the manual steppers (`MANUAL_STEPPER_LIMITS`) additionally clamp hold/rest to 1–15 and snap to whole seconds when adjusting by hand | A |
```
(replacing the existing duration-validation row)

```markdown
| Ramp/technique hint ("Exhale now Ns" / "Inhale now Ns" / "Top-off breath" / "Left nostril" / "Right nostril", joined with " · " when both a Ramp and a technique cue apply) appears under the coaching line; absent when neither applies | V |
```
(replacing the "Ramp hint" row)

```markdown
| `breathing_settings.*_seconds` / `breathing_sessions.*_seconds` are `numeric(3,1)` not null, half-step check constraints (`(x * 2) = floor(x * 2)`) on all four columns of both tables | A |
```
(replacing the two `integer ... check between 0 and 15` rows — keep the existing range-check language folded in if the file's exact original phrasing needs preserving verbatim; append rather than fully replace if the reviewer prefers additive edits)

Add one more row to the "Controls and labels" table:

```markdown
| Protocol Picker (Acute De-Stress / Mood Elevation / Resonance Coherence / Sleep Shift (4-7-8) / Executive Focus) is a header disclosure (`aria-expanded`, `aria-controls`) opening a non-modal overlay with a `role="group" aria-label="Protocol"`; each card carries `aria-pressed` and, when Custom is active, no card is pressed | A |
| Selecting a Protocol sets the Session Goal to its recommended cycle count; the Goal picker shows an extra pressed chip when that value isn't one of the fixed minute/cycle options | A |
```

Add to the "Out of scope for parity" section, dated:

```markdown
- Protocol Library — approved 2026-09-06: replaces the five-entry preset catalog with five science-backed protocols (Physiological Sigh, Nadi Shodhana, Resonance Frequency, 4-7-8, Box), adds a header Protocol Picker, half-second durations, and top-off/nostril technique cues. Departures from the prior parity-locked baseline, all explicitly approved as part of this feature: the default preset changes from Current Calm (4-4-6-2, Square) to Resonance Coherence (5.5/0/5.5/0, **Triangle** — a fresh, unauthenticated load now renders the Triangle, not the Square, since Resonance Coherence has no rest phase); duration validation admits 0.5s steps; the Ramp hint line is renamed and merged into a single `.mv-hint` technique/ramp hint slot; `*_seconds` columns widen from `integer` to `numeric(3,1)`. `e2e/parity.spec.ts`'s existing Square-geometry specs are explicitly re-seeded to the legacy 4-4-6-2 preferences via `mockBreathingApi` so they continue to exercise Square geometry as originally intended; a new dedicated test proves the real (unmocked) default now renders the Triangle.
```

- [ ] **Step 3: Close the tracking issue and its child tickets**

Once all four tracer-bullet tasks (1a/1b, 2a/2b/2c, 3, 4) and this docs task are merged to `main`, run per `docs/agents/issue-tracker.md` conventions:

```bash
gh issue close <acute-de-stress-etc-child-issue-numbers> \
  --comment "Shipped in feat/protocol-library — see commits on this branch/PR."
gh issue close <MAP-issue-number> \
  --comment "Protocol Library shipped: five-protocol catalog, header Protocol Picker, half-second durations, top-off and nostril technique cues. All child tickets closed."
```

(Substitute actual issue numbers created in Task 0 Step 2.)

- [ ] **Step 4: Final full-suite verification**

Run: `pnpm typecheck && pnpm exec eslint src e2e && pnpm test && pnpm test:db && pnpm test:e2e`
Expected: all green — this is the final gate before opening the PR.

- [ ] **Step 5: Manual verification pass (per spec's Verification section)**

With sound on:
- Start Acute De-Stress; hear the second rising tone at 2s into inhale, see "Top-off breath" in the hint line, see the tick on the inhale side of the Stage.
- Start Mood Elevation; see "Left nostril" / "Right nostril" alternate each cycle in the hint line.
- Idle on Resonance Coherence (default, unmocked): countdown reads `6`; open advanced options, confirm the inhale stepper reads `5.5s`; press `+` on inhale and confirm it reads `6s` and the Preset Picker trigger now reads "Protocol: Custom".
- Toggle `prefers-reduced-motion: reduce` and confirm the top-off tick has no transition and the technique hint swaps without animation.
- At a ≤480px viewport, confirm the Preset Picker overlay behaves as a bottom sheet (same as History) and never leaves the transport controls unreachable while open.

- [ ] **Step 6: Commit**

```bash
git add CONTEXT.md docs/parity-contract.md
git commit -m "docs: Protocol Library glossary entries, parity-contract updates, dated departure entry"
```

---

## Verification (full-plan summary)

- `pnpm typecheck`
- `pnpm exec eslint src e2e` (not `pnpm lint` — see Global Constraints)
- `pnpm test`
- `pnpm test:db` (requires local Supabase stack running)
- `pnpm test:e2e`
- Layout-budget e2e (`e2e/parity.spec.ts`) green at 1280×800, 1024×600, 1024×472, 390×844, advanced panel open and closed, plus the new Mood Elevation + Slow Down running scenario (Task 4 Step 17).
- Manual pass per Task 5 Step 5.
