# Reference parity contract

Source of truth: repository-root `index.html` (unchanged during implementation).

Every observable behavior below must keep an automated check and/or an explicit visual check. Phase 3 implements UI/interaction parity; Phase 6 closes verification.

Legend: **A** = automated (unit / component / Playwright), **V** = explicit visual/manual screenshot check.

## Geometry and triangle

| Behavior | Check |
| --- | --- |
| SVG `viewBox="0 0 400 366"` | A |
| Base path `M200,39 L365,325 L35,325 Z` | A |
| Inhale side `M35,325 L200,39`; hold `M200,39 L365,325`; exhale `M365,325 L35,325` | A |
| Progress dot radius `7`, starts at inhale origin `(35,325)` when idle | A |
| Dot interpolates linearly along the active side by phase progress | A |
| Active side uses `stroke-dashoffset` from `1 → 0` with `pathLength="1"` | A |
| Side states: `pending` / `active` / `completed` match phase index | A |
| Triangle wrap sizing `min(84vw, 62vh, 560px)`; short viewport `min(78vw, 46vh, 480px)` | V |
| Drop shadow and side glow match reference | V |

## Phase rules and engine

| Behavior | Check |
| --- | --- |
| Phases order: inhale → hold → exhale → (cycle++) | A |
| Default durations 4 / 4 / 6 seconds | A |
| Duration limits: inhale 2–15, hold 1–15, exhale 2–15 | A |
| Progression is timestamp-driven (`requestAnimationFrame`), not `setInterval` | A |
| Delta capped at 1s when tab was backgrounded | A |
| Multi-phase overflow while-loop advances correctly | A |
| Countdown displays `ceil(remaining)` with edge case → `0` at phase end | A |
| Elapsed formats as `MM:SS` with zero padding | A |
| Start from idle begins cycle 1 and removes SVG `idle` class | A |
| Pause cancels RAF; Resume continues without resetting progress | A |
| Reset returns idle, zero stats, pending sides, Start label | A |

## Controls and labels (bilingual)

| Behavior | Check |
| --- | --- |
| Header wordmark `Breathe` + Arabic `تنفّس` | V / A |
| Phase labels EN/AR: INHALE/شهيق, HOLD/حبس, EXHALE/زفير | A |
| Duration steppers ± with aria-labels | A |
| Reset to Recommended (4-4-6) + hint copy | A / V |
| Transport: Start / Pause / Resume / Reset | A |
| Stats: Cycle + Elapsed | A |
| Sound switch opt-in (default off) | A |
| No history sheet, badge, or extra chrome absent from reference | V |

## Audio

| Behavior | Check |
| --- | --- |
| Web Audio tones only when Sound is enabled | A |
| AudioContext created/resumed after user gesture | A |
| Inhale rising 220→440 (0.5s); hold double 392; exhale falling 440→180 (0.7s) | A |

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
| `@media (max-width: 480px)` tighter transport/buttons | V |
| `@media (max-height: 640px)` smaller triangle + header | V |
| Desktop / mobile / short-viewport Playwright scenarios | A |

## Reduced motion

| Behavior | Check |
| --- | --- |
| `prefers-reduced-motion: reduce` disables blob drift and phase pulse | A / V |
| Control transitions minimized; side stroke transition near-instant | A / V |

## Design tokens (visual)

| Token group | Check |
| --- | --- |
| Background `#0a0e1a` / `#0d1220`, phase colors, ink scale, panel glass | V |
| Display / label / Arabic font stacks | V |
| Ambient blobs tint by `phase-*` body class | V |

## Out of scope for parity

- Login UI, history lists, badges, marketing chrome, or any control not present in `index.html`
- Changing reference HTML behavior “for improvement” without documented approval
