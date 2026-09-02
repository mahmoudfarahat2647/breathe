"use client";

/**
 * PROTOTYPE — issue #17 (Visual language & surface treatment), throwaway.
 *
 * Three structurally different takes on the Control Deck's density/radius/
 * rhythm, built on top of the #20/#21 unified-panel decision (glass surface,
 * flat/uniform sections — those stay locked, not being re-litigated here).
 * Each variant reuses the real PresetPicker / DurationStepper / GoalPicker /
 * HistoryPanel components (same live engine data), only the surrounding
 * layout and button treatment changes. Styling deltas are scoped via an
 * inline <style> block per variant so nothing in globals.css is touched —
 * delete this file and the switcher wiring in breathe-app.tsx once #17 is
 * decided; nothing here is meant to survive to main.
 *
 * Capture: see the `prototype/control-deck-visual-language` branch and the
 * comment on issue #17 for the settled decisions this explores.
 */

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ControlDeck } from "./control-deck";
import { DurationStepper } from "./duration-stepper";
import { PresetPicker } from "./preset-picker";

type ControlDeckProps = ComponentProps<typeof ControlDeck>;

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="4 8 9 8 14 4 14 20 9 16 4 16 4 8" />
      {on ? (
        <path d="M17.5 8.5a5 5 0 0 1 0 7" />
      ) : (
        <path d="M17 9l4 6M21 9l-4 6" />
      )}
    </svg>
  );
}

/* ---------------------------------------------------------------------- *
 * Variant A — "Tight Stack": same six-section structure as #20/#21,
 * tightened row padding + softened (non-pill) button radius. The safe,
 * minimal-delta option.
 * ---------------------------------------------------------------------- */
export function PrototypeVariantA({
  view,
  activePresetId,
  soundEnabled,
  startRef,
  pauseRef,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSelectPreset,
  onAnnounce,
  onSoundChange,
  history,
  goalPicker,
}: ControlDeckProps) {
  const rows: { id: string; content: ReactNode }[] = [
    {
      id: "primary",
      content: (
        <div className="control-deck-row control-deck-row-primary">
          <div className="transport-row">
            {view.showPause ? (
              <Button ref={pauseRef} type="button" variant="breathePrimary" size="breathe" onClick={onPause}>
                Pause
              </Button>
            ) : (
              <Button ref={startRef} type="button" variant="breathePrimary" size="breathe" onClick={onStart}>
                {view.primaryLabel}
              </Button>
            )}
            <Button type="button" variant="breatheSecondary" size="breathe" onClick={onReset}>
              Reset
            </Button>
          </div>
          <div className="stats-row">
            <div className="stat">
              <span className="stat-label label-tier">Cycle</span>
              <span className="stat-value">{view.cycleCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label label-tier">Elapsed</span>
              <span className="stat-value">{view.elapsed}</span>
            </div>
            {view.goalRemaining !== null ? (
              <div className="stat">
                <span className="stat-label label-tier">Remaining</span>
                <span className="stat-value">{view.goalRemaining}</span>
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    { id: "preset", content: <div className="control-deck-row"><PresetPicker activePresetId={activePresetId} onSelect={onSelectPreset} onAnnounce={onAnnounce} /></div> },
    { id: "durations", content: <div className="control-deck-row"><DurationStepper view={view} activePresetId={activePresetId} onAdjust={onAdjust} /></div> },
    ...(goalPicker ? [{ id: "goal", content: <div className="control-deck-row">{goalPicker}</div> }] : []),
    {
      id: "sound",
      content: (
        <div className="control-deck-row control-deck-row-sound">
          <label className="switch-field">
            <Switch className="breathe-switch" checked={soundEnabled} onCheckedChange={(checked) => onSoundChange(checked)} />
            Sound
          </label>
        </div>
      ),
    },
    ...(history ? [{ id: "history", content: <div className="control-deck-row">{history}</div> }] : []),
  ];

  return (
    <section id="controls" className="control-deck proto-variant-a" aria-label="Breathing exercise controls">
      <style>{`
        .proto-variant-a .breathe-btn,
        .proto-variant-a .breathe-step-btn { border-radius: 10px; }
        .proto-variant-a .breathe-switch { border-radius: 999px; } /* switches keep pill shape, it's the universal switch affordance */
        .proto-variant-a .control-deck-row { padding: 9px 0; }
        .proto-variant-a .control-deck-row-primary { padding-top: 2px; }
      `}</style>
      <Card className="panel panel-elevated control-deck-unified gap-0 ring-0">
        {rows.map((row, i) => (
          <span key={row.id}>
            {i > 0 && <div className="control-deck-divider" role="separator" aria-hidden="true" />}
            {row.content}
          </span>
        ))}
      </Card>
    </section>
  );
}
PrototypeVariantA.variantName = "Tight Stack";

/* ---------------------------------------------------------------------- *
 * Variant B — "Grouped Chips": same six information groups, but Sound
 * moves into the Transport row as a compact icon toggle (saves a whole
 * row), and preset/goal chips wrap densely instead of a single row.
 * ---------------------------------------------------------------------- */
export function PrototypeVariantB({
  view,
  activePresetId,
  soundEnabled,
  startRef,
  pauseRef,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSelectPreset,
  onAnnounce,
  onSoundChange,
  history,
  goalPicker,
}: ControlDeckProps) {
  const rows: { id: string; content: ReactNode }[] = [
    {
      id: "primary",
      content: (
        <div className="control-deck-row control-deck-row-primary" style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div className="transport-row">
            {view.showPause ? (
              <Button ref={pauseRef} type="button" variant="breathePrimary" size="breathe" onClick={onPause}>
                Pause
              </Button>
            ) : (
              <Button ref={startRef} type="button" variant="breathePrimary" size="breathe" onClick={onStart}>
                {view.primaryLabel}
              </Button>
            )}
            <Button type="button" variant="breatheSecondary" size="breathe" onClick={onReset}>
              Reset
            </Button>
          </div>
          <div className="stats-row" style={{ margin: 0 }}>
            <div className="stat">
              <span className="stat-label label-tier">Cycle</span>
              <span className="stat-value">{view.cycleCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label label-tier">Elapsed</span>
              <span className="stat-value">{view.elapsed}</span>
            </div>
            {view.goalRemaining !== null ? (
              <div className="stat">
                <span className="stat-label label-tier">Remaining</span>
                <span className="stat-value">{view.goalRemaining}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-pressed={soundEnabled}
            aria-label="Sound"
            title="Sound"
            onClick={() => onSoundChange(!soundEnabled)}
            className="proto-icon-toggle"
            data-on={soundEnabled}
          >
            <SoundIcon on={soundEnabled} />
          </button>
        </div>
      ),
    },
    { id: "preset", content: <div className="control-deck-row"><PresetPicker activePresetId={activePresetId} onSelect={onSelectPreset} onAnnounce={onAnnounce} /></div> },
    { id: "durations", content: <div className="control-deck-row"><DurationStepper view={view} activePresetId={activePresetId} onAdjust={onAdjust} /></div> },
    ...(goalPicker ? [{ id: "goal", content: <div className="control-deck-row">{goalPicker}</div> }] : []),
    ...(history ? [{ id: "history", content: <div className="control-deck-row">{history}</div> }] : []),
  ];

  return (
    <section id="controls" className="control-deck proto-variant-b" aria-label="Breathing exercise controls">
      <style>{`
        .proto-variant-b .breathe-btn,
        .proto-variant-b .breathe-step-btn { border-radius: 12px; }
        .proto-variant-b .control-deck-row { padding: 10px 0; }
        .proto-variant-b .preset-options,
        .proto-variant-b .goal-options { flex-wrap: wrap; row-gap: 8px; }
        .proto-variant-b .proto-icon-toggle {
          width: 34px; height: 34px; border-radius: 10px; flex: 0 0 auto;
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--panel-border); background: transparent;
          color: var(--ink-300); cursor: pointer;
        }
        .proto-variant-b .proto-icon-toggle[data-on="true"] {
          background: linear-gradient(135deg, var(--phase-inhale), #4d9d8a);
          color: #06120e; border-color: transparent;
        }
      `}</style>
      <Card className="panel panel-elevated control-deck-unified gap-0 ring-0">
        {rows.map((row, i) => (
          <span key={row.id}>
            {i > 0 && <div className="control-deck-divider" role="separator" aria-hidden="true" />}
            {row.content}
          </span>
        ))}
      </Card>
    </section>
  );
}
PrototypeVariantB.variantName = "Grouped Chips";

/* ---------------------------------------------------------------------- *
 * Variant C — "Merged & Split": most aggressive compaction. Sound is an
 * icon toggle in the Transport row (as in B); Preset Picker and Session
 * Goal share one row behind a small segmented tab, so only one chip strip
 * is visible at a time. Fewest total rows/dividers of the three.
 * ---------------------------------------------------------------------- */
export function PrototypeVariantC({
  view,
  activePresetId,
  soundEnabled,
  startRef,
  pauseRef,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSelectPreset,
  onAnnounce,
  onSoundChange,
  history,
  goalPicker,
}: ControlDeckProps) {
  // Local, throwaway: which tab of the merged Preset/Goal row is shown.
  // Uses a plain DOM data attribute + CSS instead of React state so this
  // stays a single dependency-free file; fine for a rough mockup.
  const rows: { id: string; content: ReactNode }[] = [
    {
      id: "primary",
      content: (
        <div className="control-deck-row control-deck-row-primary" style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div className="transport-row">
            {view.showPause ? (
              <Button ref={pauseRef} type="button" variant="breathePrimary" size="breathe" onClick={onPause}>
                Pause
              </Button>
            ) : (
              <Button ref={startRef} type="button" variant="breathePrimary" size="breathe" onClick={onStart}>
                {view.primaryLabel}
              </Button>
            )}
            <Button type="button" variant="breatheSecondary" size="breathe" onClick={onReset}>
              Reset
            </Button>
          </div>
          <div className="stats-row" style={{ margin: 0 }}>
            <div className="stat">
              <span className="stat-label label-tier">Cycle</span>
              <span className="stat-value">{view.cycleCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label label-tier">Elapsed</span>
              <span className="stat-value">{view.elapsed}</span>
            </div>
            {view.goalRemaining !== null ? (
              <div className="stat">
                <span className="stat-label label-tier">Remaining</span>
                <span className="stat-value">{view.goalRemaining}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-pressed={soundEnabled}
            aria-label="Sound"
            title="Sound"
            onClick={() => onSoundChange(!soundEnabled)}
            className="proto-icon-toggle"
            data-on={soundEnabled}
          >
            <SoundIcon on={soundEnabled} />
          </button>
        </div>
      ),
    },
    {
      id: "preset-and-goal",
      content: (
        <div className="control-deck-row proto-tabbed-row">
          <div className="proto-tab-strip" role="tablist" aria-label="Preset or Session goal">
            <button type="button" className="proto-tab" data-tab="preset" aria-selected="true" role="tab">Preset</button>
            {goalPicker ? (
              <button type="button" className="proto-tab" data-tab="goal" aria-selected="false" role="tab">Goal</button>
            ) : null}
          </div>
          <div className="proto-tab-panel" data-panel="preset">
            <PresetPicker activePresetId={activePresetId} onSelect={onSelectPreset} onAnnounce={onAnnounce} />
          </div>
          {goalPicker ? <div className="proto-tab-panel" data-panel="goal" hidden>{goalPicker}</div> : null}
        </div>
      ),
    },
    { id: "durations", content: <div className="control-deck-row"><DurationStepper view={view} activePresetId={activePresetId} onAdjust={onAdjust} /></div> },
    ...(history ? [{ id: "history", content: <div className="control-deck-row">{history}</div> }] : []),
  ];

  return (
    <section id="controls" className="control-deck proto-variant-c" aria-label="Breathing exercise controls">
      <style>{`
        .proto-variant-c .breathe-btn,
        .proto-variant-c .breathe-step-btn { border-radius: 8px; }
        .proto-variant-c .control-deck-row { padding: 9px 0; }
        .proto-variant-c .proto-icon-toggle {
          width: 34px; height: 34px; border-radius: 8px; flex: 0 0 auto;
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--panel-border); background: transparent;
          color: var(--ink-300); cursor: pointer;
        }
        .proto-variant-c .proto-icon-toggle[data-on="true"] {
          background: linear-gradient(135deg, var(--phase-inhale), #4d9d8a);
          color: #06120e; border-color: transparent;
        }
        .proto-variant-c .proto-tabbed-row { width: 100%; }
        .proto-variant-c .proto-tab-panel { width: 100%; }
        .proto-variant-c .proto-tab-strip { display: flex; gap: 6px; margin-bottom: 8px; }
        .proto-variant-c .proto-tab {
          font: inherit; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 999px; border: 1px solid var(--panel-border-quiet);
          background: transparent; color: var(--ink-500); cursor: pointer;
        }
        .proto-variant-c .proto-tab[aria-selected="true"] { color: var(--ink-100); border-color: var(--panel-border-strong); }
        /* rough mockup only: a real build would wire tab state; here CSS
           just shows the "Preset" panel to demonstrate the merged-row idea */
      `}</style>
      <Card className="panel panel-elevated control-deck-unified gap-0 ring-0">
        {rows.map((row, i) => (
          <span key={row.id}>
            {i > 0 && <div className="control-deck-divider" role="separator" aria-hidden="true" />}
            {row.content}
          </span>
        ))}
      </Card>
    </section>
  );
}
PrototypeVariantC.variantName = "Merged & Split";
