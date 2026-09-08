# Reference parity contract

Full parity has been verified against the approved redesign mockup (spec #23), extending the original reference to a four-phase rounded-perimeter cycle with commercial side bands and header History disclosure. Next.js is the sole implementation in the repository.

Every observable behavior below is verified via automated tests (unit, component, Playwright e2e) and explicit visual/accessibility checks.

Legend: **A** = automated (unit / component / Playwright), **V** = explicit visual/manual screenshot check.

## Geometry and square

| Behavior | Check |
| --- | --- |
| SVG `viewBox="0 0 400 400"` | A |
| Shared `.square-frame-border` rounded-perimeter path | A |
| Four rounded-perimeter segments (inhale, hold, exhale, rest) with `pathLength="1"` | A |
| Frame border and tracer share one geometry (coincident at every size) | A |
| Frame border and tracer are the same rounded-perimeter geometry; the frame's CSS border-radius (8%) and the SVG corner radius (32 of the 400 viewBox) are a coupled pair — changing one requires changing the other | A / V |
| Dot computed via `pointOnRoundedSegment` along the active rounded segment; hidden when idle and under reduced motion | A |
| Active side uses `stroke-dashoffset` from `1 → 0` with `pathLength="1"` | A |
| Side states: `pending` / `active` / `completed` match phase index for four sides | A |
| Stage sizing `.mv-square` uses `aspect-ratio: 1/1` and `width: min(88cqh, 26cqw, 400px)` (height term trimmed to `82cqh` in the ≥1200px-wide, ≥641px-tall regime — see Responsive breakpoints), preserving Stage rendered width ≥ 280px at 1280×800 with side bands | A / V |
| CSS/component names use `square-*` / `mv-*`; progress dot id remains `#progressDot` | A |
| Frosted frame border, glow, and tracer match redesign palette; glow reduces at short heights | V |

## Phase rules and engine

| Behavior | Check |
| --- | --- |
| Phases order: inhale → hold → exhale → rest. Cycle increments when index wraps to inhale | A |
| Default pattern is Resonance Coherence, 5.5-0-5.5-0 seconds (`DEFAULT_PRESET_ID`, `BreathingSettings.default()`); a fresh, never-configured load renders the Square with the rest side shown as instantly complete | A |
| Duration validation (`PHASE_DURATION_LIMITS`) allows inhale/exhale 2–15 and hold/rest **0–15**, in half-second (0.5) steps; the manual steppers (`MANUAL_STEPPER_LIMITS`) additionally clamp hold/rest to 1–15 and snap to the next whole second in the direction pressed, so hand-adjusting a fractional value (e.g. 5.5) lands on a whole number. A value already below the stepper's own minimum (a hand-set 0.5 hold/rest) is held in place by the never-push-below-current floor rather than snapped | A |
| Phase advancement is timestamp-driven (`requestAnimationFrame`), not `setInterval` | A |
| Delta capped at 1s when tab was backgrounded | A |
| Multi-phase overflow while-loop advances correctly across four phases | A |
| Countdown displays `ceil(remaining)` with edge case → `0` at phase end | A |
| Elapsed formats as `MM:SS` with zero padding | A |
| Start from idle begins cycle 1 and removes SVG `idle` class | A |
| Pause cancels RAF; Resume continues without resetting progress | A |
| Reset returns idle, zero stats, pending sides, Start label | A |
| Ramp Off (default) leaves phase timing byte-identical to the rules above | A |

## Controls and labels

| Behavior | Check |
| --- | --- |
| Header wordmark `Breathe` (English only) with MarkIcon | V / A |
| Four outside edge labels (Inhale top / Hold right / Exhale bottom / Rest left), active one highlighted, plus a coaching line | A |
| Duration steppers ± with aria-labels for inhale, hold, exhale, and rest | A |
| Advanced options panel is a disclosure (`aria-expanded`, `aria-controls`) labelled "Show advanced options"; closed by default | A |
| Transport: Start / Pause / Resume, and conditional Reset (idle → hidden) | A |
| Stats: Cycle (goal-aware: "n / N" for a cycles goal) + Elapsed | A |
| Sound switch opt-in (default off) with visible On/Off word | A |
| History is a header disclosure opening a non-modal overlay | A / V |
| Ramp picker (Off / Wind down / Slow down) is a `role="group"` inside the advanced options disclosure panel; each chip carries `aria-pressed` | A |
| Ramp hint ("Exhale now Ns" / "Inhale now Ns") appears under the coaching line while a Ramp has lengthened the live phase past its base duration; absent when Ramp is Off or the phase is at base | V |
| Preset Picker is a header disclosure alongside History: trigger shows the active protocol's name (or "Custom" when no catalog entry matches current durations), `aria-expanded`/`aria-controls` on the trigger, non-modal overlay dismissible by Escape or outside click, with focus restored to the trigger on Escape and on card selection (an outside click closes without moving focus, matching History); each protocol card carries `aria-pressed` reflecting whether it is the active preset (no card pressed when Custom); picking a card applies its durations, sets the Session Goal to its `recommendedCycles` without emitting the "next session" goal-change announcement, and closes the overlay; a goal value with no matching fixed Goal-picker chip renders one extra, pressed chip for that exact value | A |
| Ramp hint and technique hint (top-off / nostril cue) share one line under the coaching text, joined by " · " when both are present, Ramp hint first; the technique hint alone reads "Top-off breath", "Left nostril", or "Right nostril" | A |

## Audio

| Behavior | Check |
| --- | --- |
| Web Audio tones only when Sound is enabled | A |
| AudioContext created/resumed after user gesture | A |
| Inhale rising 220→440 (0.5s); hold double 392; exhale falling 440→180 (0.7s); rest is silence (`[]`) | A |

## Keyboard

| Behavior | Check |
| --- | --- |
| Space toggles start/pause when focus is not on BUTTON/INPUT | A |
| `R` / `r` resets always | A |
| Focused BUTTON/INPUT keeps native Space/Enter activation | A |

## Accessibility

| Behavior | Check |
| --- | --- |
| `aria-live="polite"` announcer speaks phase + duration | A |
| Focus moves to Pause on start and to Start/Resume on pause | A |
| Focus-visible outlines on controls | V |
| SVG decorative (`aria-hidden`) | A |
| Screen-reader-only utility available | A |

## Responsive breakpoints

| Behavior | Check |
| --- | --- |
| Root layout is `height: 100dvh; display: grid; grid-template-rows: auto minmax(260px, 1fr) auto` | A / V |
| Side bands: at ≥1200px viewport, `--mv-ad-w` reserves padding-inline; at <1200px, side bands are absent (0px) | A / V |
| Stage is a size container (`container-type: size; min-height: 0; overflow: visible`) | A / V |
| Stage sizes from container queries: `.mv-square` uses `min(88cqh, 26cqw, 400px)`; the height term is trimmed to `82cqh` under `@media (min-width: 1200px) and (min-height: 641px)` so the taller advanced panel with the Ramp row keeps the labelled Stage extent above the deck at 1280×800 (`65cqh` still applies under `max-height: 640px`) | A / V |
| Duration rows: 2×2 under 900px, four-column above | A / V |
| Control deck `min-height: 0; overflow: visible` (fallback `max-height` and `overflow-y: auto` under 640px height) | A / V |
| Labelled `.mv-square` extent bottom (square box plus the `Exhale` edge label) is strictly above `#controls` top at all four protected viewports — 1280×800, 1024×600, 1024×472, 390×844 — with advanced options both open and closed | A |
| `@media (max-width: 480px)` tighter transport/buttons and bottom-sheet History overlay | V |
| `@media (max-height: 640px)` compact stage sizing and tighter edge-label offsets | A / V |
| History is a non-modal disclosure (Escape / outside-click dismiss, focus restored to trigger on Escape); scrollable within its max-height; on ≤480px it is a bottom sheet that may cover controls while open but never leaves one unreachable | A / V |

## Reduced motion

| Behavior | Check |
| --- | --- |
| `prefers-reduced-motion: reduce` neutralizes transitions; JS-driven tracer updates without transition; moving dot hidden; edge-label, chevron, button, and History transitions neutralised | A / V |
| Control transitions minimized | A / V |

## Design tokens (visual)

| Token group | Check |
| --- | --- |
| Deep ground (`#0b0f0e`), mint accent (`#a6dbbb`), warm ink (`#e8e4d8`), opaque panel (`#131a16`), cream primary button (`#e9e6da`) | V |
| Display / label font stacks (Outfit) | V |
| Static dim forest photo (`/forest-ground.webp`) under a vignette + darkening wash, with subtle grain overlay; composited ground luminance matches the former gradient-only ground, so text over `.mv-bg` keeps its contrast. Falls back to the gradient-only ground under `prefers-reduced-data: reduce` or if the image fails to load | V |

## Persistence

| Behavior | Check |
| --- | --- |
| Settings DTO, session snapshot, HTTP body, mappers, repository select, and generated types include `rest` / `rest_seconds` | A |
| `breathing_settings.rest_seconds` numeric(3,1) not null default 2, check between 0 and 15 and a half-second-step check constraint | A |
| `breathing_sessions.rest_seconds` numeric(3,1) not null default 0, check `>= 0` and a half-second-step check constraint (no backfill of 2 onto historical rows) | A |
| Settings equality checks compare rest so a saved rest duration actually loads | A |
| Settings DTO, HTTP body, mapper (both directions), repository select, and generated types carry `ramp`; `breathing_settings.ramp` is nullable text checked against `('wind-down', 'slow-down')` | A |
| All four duration columns (`inhale_seconds`, `hold_seconds`, `exhale_seconds`, `rest_seconds`) on both `breathing_settings` and `breathing_sessions` are `numeric(3,1)` with a half-step (`value * 2 = floor(value * 2)`) check constraint per column, additive to the existing range checks; every mapper coerces the column to a JS number, since numeric columns can round-trip as numeric-formatted strings | A |

## Out of scope for parity

- Changing reference HTML behavior “for improvement” without documented approval
- Redesigned to the approved mockup — reviewed and approved 2026-09-02 (spec #23).
- Forest-photo ground added over the gradient — approved 2026-09-02 (supersedes #23's "gradient ground, not forest photo" departure; contrast, reduced-motion and reduced-transparency re-verified).
- Ramp (Wind Down / Slow Down) — re-verified end-to-end 2026-09-03 (#36 Ramp T4): `e2e/ramp.spec.ts` proves both ramps in a real browser; layout-budget e2e re-enabled and green at all four protected viewports (1280×800, 1024×600, 1024×472, 390×844), panel open and closed, after trimming the Stage height term to `82cqh` in the ≥1200×≥641 regime so the open advanced panel's Ramp row no longer pushes the `Exhale` label into the deck; reduced-motion and the Stage hint line visually re-checked.
- Single Stage shape — approved 2026-09-06: the Stage now always renders the Square. The former "`rest = 0` swaps to a Triangle" rendering path (`BreathingTriangle`, the `TRIANGLE_*` geometry, and the `interpolateTriangleDot` dot path) is removed; a zero-rest preset (e.g. Resonance Coherence) draws all four rounded-perimeter segments with the rest side shown as instantly complete. Supersedes the "default preset renders the Triangle" departure noted for #39. `e2e/preset-default.spec.ts` re-verifies the unmocked compiled-in default renders the Square with Resonance Coherence durations.
- Default pattern is Resonance Coherence (5.5/0/5.5/0) — approved 2026-09-06 (#41): supersedes the former `Default pattern 4-4-6-2 seconds` row; half-second duration validation lands with it.
- Protocol Library (five named, science-backed presets) — approved 2026-09-08 (#39, #40–#43): `BREATHING_PRESET_CATALOG` is replaced wholesale (Acute De-Stress, Mood Elevation, Resonance Coherence, Sleep Shift (4-7-8), Executive Focus), each carrying a `recommendedCycles` dosage, and Resonance Coherence's 5.5s inhale/exhale durations require the half-second validation step above. Two technique cues ship with it: the physiological sigh's top-off (audio tone + "Inhale again." announcement + Stage tick, ramp-safe, fires once per inhale) and Nadi Shodhana's alternating nostril hint — both surfaced via the merged Ramp/technique hint line rather than a second stacked line. A saved duration set that matches no current catalog entry (including the pre-#41 default, 4-4-6-2) loads as Custom; no migration is performed on existing saved settings.
