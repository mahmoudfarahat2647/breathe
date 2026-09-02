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
| Stage sizing `.mv-square` uses `aspect-ratio: 1/1` and `width: min(88cqh, 26cqw, 400px)`, preserving Stage rendered width ≥ 280px at 1280×800 with side bands | A / V |
| CSS/component names use `square-*` / `mv-*`; progress dot id remains `#progressDot` | A |
| Frosted frame border, glow, and tracer match redesign palette; glow reduces at short heights | V |

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
| Header wordmark `Breathe` (English only) with MarkIcon | V / A |
| Four outside edge labels (Inhale top / Hold right / Exhale bottom / Rest left), active one highlighted, plus a coaching line | A |
| Duration steppers ± with aria-labels for inhale, hold, exhale, and rest | A |
| Advanced options panel is a disclosure (`aria-expanded`, `aria-controls`) labelled "Show advanced options"; closed by default | A |
| Transport: Start / Pause / Resume, and conditional Reset (idle → hidden) | A |
| Stats: Cycle (goal-aware: "n / N" for a cycles goal) + Elapsed | A |
| Sound switch opt-in (default off) with visible On/Off word | A |
| History is a header disclosure opening a non-modal overlay | A / V |

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
| Stage sizes from container queries: `.mv-square` uses `min(88cqh, 26cqw, 400px)` | A / V |
| Duration rows: 2×2 under 900px, four-column above | A / V |
| Control deck `min-height: 0; overflow: visible` (fallback `max-height` and `overflow-y: auto` under 640px height) | A / V |
| Labelled `.mv-square` extent bottom is strictly above `#controls` top at 1280×800, 1024×600, 1024×472, and 390×844 (advanced options open and closed) | A |
| `@media (max-width: 480px)` tighter transport/buttons and bottom-sheet History overlay | V |
| `@media (max-height: 640px)` compact stage sizing and tighter edge-label offsets | A / V |
| History is a non-modal disclosure (Escape / outside-click dismiss, focus restored to trigger); scrollable within its max-height; on ≤480px it is a bottom sheet that may cover controls while open but never leaves one unreachable | A / V |

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
| `breathing_settings.rest_seconds` integer not null default 2, check between 1 and 15 | A |
| `breathing_sessions.rest_seconds` integer not null default 0, check `>= 0` (no backfill of 2 onto historical rows) | A |
| Settings equality checks compare rest so a saved rest duration actually loads | A |

## Out of scope for parity

- Changing reference HTML behavior “for improvement” without documented approval
- Redesigned to the approved mockup — reviewed and approved 2026-09-02 (spec #23).
- Forest-photo ground added over the gradient — approved 2026-09-02 (supersedes #23's "gradient ground, not forest photo" departure; contrast, reduced-motion and reduced-transparency re-verified).
