# Mockup reference sheet

Source: `design/mockup.png` — 1586 × 992 px, 8-bit RGB, aspect 1.599 (≈16:10).
Treated as a ~1600×1000 / 1440×900-class desktop frame. All px below are in the
raster's own 1586-wide space; the build translates them to proportions / `clamp()`
because the screen stays responsive.

Confidence: **H** measured by edge scan / flat-region sampling · **M** eyeballed ·
**L** guess, needs confirmation.

## Canvas / ground

| Property | Value | Conf | vs current app |
|---|---|---|---|
| Background base | `#0b0f0e` → `#0b110f` (near-black, faint cool green) | H | app is `#07140f`/`#0c1c16` — mockup is lighter, greyer, less saturated |
| Background texture | very faint pine-forest photo, low contrast, corners lighter than centre | M | app has 4 blurred colour blobs + grain; mockup reads as one dim photo + vignette |
| Vignette | darkening toward bottom & centre-sides | M | — |

## Header (y ≈ 28–56, ~28px tall)

| Element | Value | Conf |
|---|---|---|
| Left: ring/circle icon + wordmark **"QUIET ORBIT"** | tracked-out uppercase, dim white, starts x≈28, icon ~18px | H (text) |
| Right: **"History"** pill | clock icon + label, outlined pill, right edge x≈1524, starts x≈1403 (~120px wide) | H |

## Stage square

| Property | Value | Conf | vs current |
|---|---|---|---|
| Bounding box | x≈618–968, y≈139–488 → **~350 × 350**, centred x≈793, centre y≈313 | H | current is `min(100cqw,100cqh,560px)`; mockup ~0.22 × frame width |
| Corner radius | generous, ~30px at this scale (~9% of side) | M | current SVG has square corners (path `M40,360…`) |
| Border | crisp inner keyline + soft outer glow; glow `#22392f`→`#2c4338`, bright active-side tracer `#a6dbbb` | H | current: 6px stroked side, glow via `drop-shadow` — similar idea |
| Progress dot | bright mint dot on the inhale (top) edge, ~top-centre, slightly left | H | current `#progressDot` r=7 — keep |
| **Fill** | frosted grey-green wash, ~`rgb(85,95,84)` `#555f54`, fairly flat, clearly lighter than outside | H | **current square has no fill** — this is new |
| Phase labels | **all four shown at once, outside the edges**: `INHALE` above, `HOLD` reading top→bottom on the right, `EXHALE` below, `REST` reading top→bottom on the left. Teal, tracked-out uppercase, small | H | **current shows only the active phase name, centred inside** — big change |
| Centre stack | large countdown **`4`** (light weight, warm off-white `~#e8e4d8`), then caption **"Breathe in slowly"** (light, sentence case) | H | current: phase name + countdown + `"4 seconds"`. Mockup drops the inside phase name and the "seconds" hint, adds a coaching caption |

## Transport

| Element | Value | Conf | vs current |
|---|---|---|---|
| **Start button** | large pill, **solid light/cream fill** (`~#e9e6da`), black ► play glyph + "Start" in near-black; x≈663–923 (~260px), y≈558–628 (~70px), centred | H | current: teal gradient fill, no icon. Mockup inverts to light-on-dark |
| (Reset / Pause) | not visible in this state (button reads "Start") | — | current always shows Reset too |

## Stat row (below Start, y ≈ 665–715)

Three groups, centred, each = small line-icon + stacked `LABEL` / value:

| Group | Icon | Label | Value | Conf |
|---|---|---|---|---|
| Cycle | refresh-circle | `CYCLE` | `5 / 5` (goal-aware — shows target) | H |
| Elapsed | clock | `ELAPSED` | `01:20` | H |
| Sound | waveform | `SOUND` | `ON` + pill toggle (green when on, `#436153`) | H |

Thin vertical divider between Elapsed and Sound. Values in soft green. **Current app: text labels only, no icons, Cycle shows a bare count, Sound switch sits inline in the primary row.**

## Control Deck (bottom panel, y ≈ 749 → 992, full width)

| Property | Value | Conf | vs current |
|---|---|---|---|
| Panel | raised, fill `#141b17` (barely above ground), top hairline `#131a17`, slightly inset with rounded top corners | H | current: one glass `panel-elevated` card, `max-width:880px`, centred |
| Layout | **two columns**: left `BREATHING PRESET`, right `SESSION GOAL`; faint divider ~x=880 | H | **current: single vertical stack** (transport row → preset → durations → goal → history) with 4 dividers, `.control-deck-unified` has exactly 9 children |
| Preset chips | `Current Calm` (selected: thin outline box + dot beneath label, fill `#202f28`), `Triangle`, `Box`, `4-7-8 Relaxation`, `Coherence` | H | same catalogue; current uses `breathePrimary`/`breatheGhost` pill buttons in a `radiogroup` |
| Goal chips | `None`, `2 min`, `5 min`, `10 min`, `5 cycles` (selected), `10 cycles` | H | same options; current `role="group"` pill buttons |
| Disclosure | centred below both columns: chevron-down + **"Show advanced options"** | H | **current: a left-aligned `"Durations"` text-link disclosure** |
| History | **not in the deck** — it's the header pill | H | **current: `"History"` disclosure is `children[8]` of the deck + in tab order** |

## Palette (extracted)

| Token | Mockup | Current app token |
|---|---|---|
| ground | `#0b0f0e` | `--color-breathe-bg #07140f` |
| panel fill | `#141b17` | `--panel-bg-strong rgb(232 240 235 /.12)` |
| accent teal (bright) | `#a6dbbb` | `--color-breathe-phase-inhale #6ec9b8` |
| accent teal (dim glow) | `#2c4338` | — |
| stat value green | soft `~#9db8a6` | `--ink-300 #b4c4bb` |
| selected-chip fill | `#202f28` | — |
| Start button fill | `~#e9e6da` (light) | `linear-gradient(135deg, teal, #4d9d8a)` |
| coaching / body text | light warm white `~#e8e4d8` | `--ink-100 #e8f0eb` |

## Type

Clean geometric sans. Tracked-out uppercase for wordmark, phase labels, stat labels,
group headings. Sentence-case medium for body ("Breathe in slowly", chip labels,
"Show advanced options"). The `4` numeral is very large and light-weight.
**Cannot identify the exact face from a raster** — needs confirmation (current app
loads **Outfit** via `next/font`, and the parity contract V-locks the font stack).

## What this one image does NOT specify (classified)

| Gap | Disposition |
|---|---|
| Idle state (pre-Start): Start-only, `0 / 5`, `00:00` | **extrapolate** — same layout, sample numbers are just data |
| Running state: does Reset/Pause appear? where? | **preserve current behaviour** — Pause replaces Start, Reset appears beside it |
| Triangle mode (Rest = 0): only 3 phase labels, no REST edge | **preserve** — same styling, REST label omitted |
| Other 3 protected viewports (1280×800, 1024×600/472, 390×844) | **preserve layout budget** — square stays above deck; deck likely stacks to 1 column on narrow |
| Hover / focus-visible treatment | **needs decision** during build, against the new ground |
| "QUIET ORBIT" — real rename or placeholder? | **needs user decision** (branding, metadata, page title, tests, glossary) |
| Exact typeface | **needs user decision** |
