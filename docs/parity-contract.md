# Reference parity contract

Full parity has been verified against the original reference specification, then extended to a four-phase square cycle. Next.js is the sole implementation in the repository.

Every observable behavior below is verified via automated tests (unit, component, Playwright e2e) and explicit visual/accessibility checks.

Legend: **A** = automated (unit / component / Playwright), **V** = explicit visual/manual screenshot check.

## Geometry and square

| Behavior | Check |
| --- | --- |
| SVG `viewBox="0 0 400 400"` | A |
| Base path `M40,360 L40,40 L360,40 L360,360 Z` | A |
| Inhale side `M40,360 L40,40`; hold `M40,40 L360,40`; exhale `M360,40 L360,360`; rest `M360,360 L40,360` | A |
| Progress dot radius `7`, starts at inhale origin `(40,360)` when idle | A |
| Dot interpolates linearly along the active side by phase progress | A |
| Active side uses `stroke-dashoffset` from `1 → 0` with `pathLength="1"` | A |
| Side states: `pending` / `active` / `completed` match phase index for four sides | A |
| Square wrap uses `aspect-ratio: 1/1` and `width: min(100cqw, 100cqh, 560px)` | A / V |
| CSS/component names use `square-*` (not `triangle-*`); progress dot id remains `#progressDot` | A |
| Drop shadow and side glow match the forest glass language; glow reduces at short heights | V |

## Phase rules and engine

| Behavior | Check |
| --- | --- |
| Phases order: inhale → hold → exhale → rest. Cycle increments when index wraps to inhale | A |
| Default pattern 4-4-6-2 seconds | A |
| Duration limits: inhale 2–15, hold 1–15, exhale 2–15, rest 1–15 (default 2) | A |
| Progression is timestamp-driven (`requestAnimationFrame`), not `setInterval` | A |
| Delta capped at 1s when tab was backgrounded | A |
| Multi-phase overflow while-loop advances correctly across four phases | A |
| Countdown displays `ceil(remaining)` with edge case → `0` at phase end | A |
| Elapsed formats as `MM:SS` with zero padding | A |
| Start from idle begins cycle 1 and removes SVG `idle` class | A |
| Pause cancels RAF; Resume continues without resetting progress | A |
| Reset returns idle, zero stats, pending sides, Start label | A |

## Controls and labels

| Behavior | Check |
| --- | --- |
| Header wordmark `Breathe` (English only) | V / A |
| Phase labels: INHALE, HOLD, EXHALE, REST | A |
| Duration steppers ± with aria-labels for inhale, hold, exhale, and rest | A |
| Preset button `Use 4-4-6-2` + hint copy for the four-phase pattern | A / V |
| Durations panel is a disclosure (`aria-expanded`, `aria-controls`); open by default | A |
| On mount, if `matchMedia("(max-height: 640px)")` matches, the disclosure starts collapsed; user toggle wins thereafter | A |
| Transport: Start / Pause / Resume / Reset | A |
| Stats: Cycle + Elapsed | A |
| Sound switch opt-in (default off) | A |
| No history sheet, badge, or extra chrome absent from reference | V |

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
| Root layout is `height: 100dvh; display: grid; grid-template-rows: auto minmax(0, 1fr) auto` so the square and control deck never overlap | A / V |
| Stage is a size container (`container-type: size; min-height: 0; overflow: hidden`) | A / V |
| Square wrap sizes from container queries; countdown uses `cqi` clamp, not `14vmin` | A / V |
| Duration rows: 2×2 under 900px, four-column above; durations panel max-width allows four steppers | A / V |
| Control deck `min-height: 0; overflow-y: auto` as a fallback when content is taller than the viewport | A / V |
| `.square-wrap` bottom is strictly above `#controls` top at 1280×800, 1024×600, 1024×472, and 390×844 | A |
| `@media (max-width: 480px)` tighter transport/buttons | V |
| `@media (max-height: 640px)` smaller square, reduced glow, and collapsed durations disclosure | A / V |

## Reduced motion

| Behavior | Check |
| --- | --- |
| `prefers-reduced-motion: reduce` disables blob drift and phase pulse | A / V |
| Control transitions minimized; side stroke transition near-instant | A / V |

## Design tokens (visual)

| Token group | Check |
| --- | --- |
| Background forest ink, phase colors (including rest), ink scale, panel glass | V |
| Display / label font stacks (Outfit) | V |
| Ambient blobs tint by `phase-*` body class, including `phase-rest` | V |

## Persistence

| Behavior | Check |
| --- | --- |
| Settings DTO, session snapshot, HTTP body, mappers, repository select, and generated types include `rest` / `rest_seconds` | A |
| `breathing_settings.rest_seconds` integer not null default 2, check between 1 and 15 | A |
| `breathing_sessions.rest_seconds` integer not null default 0, check `>= 0` (no backfill of 2 onto historical rows) | A |
| Settings equality checks compare rest so a saved rest duration actually loads | A |

## Out of scope for parity

- Login UI, history lists, badges, marketing chrome, or any control not present in the four-phase square product
- Changing reference HTML behavior “for improvement” without documented approval
- Restyling away from the existing dark forest glass visual language
