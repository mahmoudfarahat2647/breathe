"use client";

/**
 * PROTOTYPE (mockup restyle) — the redesign candidate screen, rendered only at
 * `/?variant=mockup`. Uses the real engine hook and the real leaf components
 * (PresetPicker, GoalPicker, DurationStepper, HistoryPanel, BreathingSquare/
 * Triangle); only the composition and chrome are new. All candidate styling is
 * scoped to `.breathe-root.mockup-variant` in globals.css so the production
 * screen at `/` is untouched during convergence.
 *
 * Reference: design/mockup.png + design/reference-sheet.md.
 *
 * Throwaway: on approval this is folded into breathe-app.tsx / the real
 * components / globals.css, and this file, mockup-variant-controller.tsx,
 * mockup-switcher.tsx, mockup-fixture.ts and the scoped CSS block are deleted.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CycleIcon,
  ElapsedIcon,
  HistoryGlyph,
  MarkIcon,
  PlayIcon,
  ResetIcon,
  SoundIcon,
} from "@/components/mockup-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BreathingSquare } from "./breathing-square";
import { BreathingTriangle } from "./breathing-triangle";
import { DurationStepper } from "./duration-stepper";
import { GoalPicker } from "./goal-picker";
import { HistoryPanel } from "./history-panel";
import { handleBreathingKeydown } from "./keyboard";
import {
  createHttpBreathingPersistence,
  type BreathingPersistence,
} from "./persistence";
import { useBreathingEngine } from "./use-breathing-engine";
import type { Phase } from "@/domain/phase";

const httpPersistence = createHttpBreathingPersistence();

const COACH: Record<Phase, string> = {
  inhale: "Breathe in slowly",
  hold: "Hold gently",
  exhale: "Breathe out slowly",
  rest: "Rest",
};

const EDGES: { phase: Phase; label: string }[] = [
  { phase: "inhale", label: "Inhale" },
  { phase: "hold", label: "Hold" },
  { phase: "exhale", label: "Exhale" },
  { phase: "rest", label: "Rest" },
];

export function BreatheAppMockup({
  persistence = httpPersistence,
}: {
  persistence?: BreathingPersistence;
} = {}) {
  const [sessionSavedRevision, setSessionSavedRevision] = useState(0);
  const persistenceWithHistory = useMemo<BreathingPersistence>(() => {
    return {
      ...persistence,
      async saveSession(session) {
        await persistence.saveSession(session);
        setSessionSavedRevision((revision) => revision + 1);
      },
    };
  }, [persistence]);

  const engine = useBreathingEngine({ persistence: persistenceWithHistory });
  const startRef = useRef<HTMLButtonElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef(engine.engine.status);

  useEffect(() => {
    const previous = statusRef.current;
    const next = engine.engine.status;
    statusRef.current = next;
    if (next === "running" && previous !== "running") {
      pauseRef.current?.focus();
    } else if (
      (next === "paused" || next === "completed") &&
      previous === "running"
    ) {
      startRef.current?.focus();
    }
  }, [engine.engine.status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleBreathingKeydown(event, {
        status: engine.engine.status,
        start: engine.start,
        pause: engine.pause,
        reset: engine.reset,
      });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [engine.engine.status, engine.pause, engine.reset, engine.start]);

  const { view } = engine;
  const triangleMode = engine.settings.rest === 0;
  const isIdle = engine.engine.status === "idle";

  const cycleText = useMemo(() => {
    if (engine.selectedGoal?.kind === "cycles") {
      return `${view.cycleCount} / ${engine.selectedGoal.cycles}`;
    }
    return view.cycleCount;
  }, [engine.selectedGoal, view.cycleCount]);

  return (
    <div className={`breathe-root mockup-variant ${view.phaseClass}`}>
      <a className="skip-link" href="#controls">
        Skip to controls
      </a>
      <div className="mv-bg" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <aside className="mv-ad mv-ad-left" aria-hidden="true">
        <span>Ad</span>
      </aside>
      <aside className="mv-ad mv-ad-right" aria-hidden="true">
        <span>Ad</span>
      </aside>

      <header className="app-header mv-header">
        <span className="mv-mark">
          <MarkIcon className="mv-mark-icon" strokeWidth={1.5} aria-hidden="true" />
          <span>Breathe</span>
        </span>
        <button
          type="button"
          className="mv-history-pill"
          onClick={() => engine.announce("History")}
        >
          <HistoryGlyph size={15} strokeWidth={1.75} aria-hidden="true" />
          History
        </button>
      </header>

      <main className="stage mv-stage">
        <div className="mv-square" data-phase={view.phase}>
          {EDGES.filter((edge) => !(triangleMode && edge.phase === "rest")).map(
            (edge) => (
              <span
                key={edge.phase}
                className={`mv-edge mv-edge-${edge.phase}`}
                data-active={view.phase === edge.phase}
              >
                {edge.label}
              </span>
            ),
          )}
          <div className="mv-square-frame">
            {triangleMode ? (
              <BreathingTriangle
                view={view}
                pulse={engine.pulseNonce > 0}
                pulseKey={engine.pulseNonce}
              />
            ) : (
              <BreathingSquare
                view={view}
                pulse={engine.pulseNonce > 0}
                pulseKey={engine.pulseNonce}
              />
            )}
            <div className="mv-square-content" key={engine.pulseNonce}>
              <span className="mv-count">{view.countdown}</span>
              <span className="mv-coach">
                {isIdle ? COACH.inhale : COACH[view.phase]}
              </span>
            </div>
          </div>
        </div>
      </main>

      <div className="sr-only" role="status" aria-live="polite">
        {engine.announcement}
      </div>

      <section
        id="controls"
        className="control-deck mv-controls"
        aria-label="Breathing exercise controls"
      >
        <div className="mv-transport">
          {view.showPause ? (
            <Button
              ref={pauseRef}
              type="button"
              variant="breathePrimary"
              size="breathe"
              className="mv-start is-pause"
              onClick={engine.pause}
            >
              Pause
            </Button>
          ) : (
            <Button
              ref={startRef}
              type="button"
              variant="breathePrimary"
              size="breathe"
              className="mv-start"
              onClick={engine.start}
            >
              <PlayIcon size={18} strokeWidth={0} fill="currentColor" aria-hidden="true" />
              {view.primaryLabel}
            </Button>
          )}
          {!isIdle && (
            <Button
              type="button"
              variant="breatheSecondary"
              size="breathe"
              className="mv-reset"
              onClick={engine.reset}
            >
              <ResetIcon size={16} strokeWidth={2} aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>

        <div className="mv-stats">
          <div className="mv-stat">
            <CycleIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="mv-stat-body">
              <span className="mv-stat-label">Cycle</span>
              <span className="mv-stat-value">{cycleText}</span>
            </span>
          </div>
          <div className="mv-stat">
            <ElapsedIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="mv-stat-body">
              <span className="mv-stat-label">Elapsed</span>
              <span className="mv-stat-value">{view.elapsed}</span>
            </span>
          </div>
          <div className="mv-stat mv-stat-divider">
            <SoundIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="mv-stat-body">
              <span className="mv-stat-label">Sound</span>
              <label className="mv-sound-toggle">
                <span>{engine.soundEnabled ? "On" : "Off"}</span>
                <Switch
                  className="breathe-switch"
                  size="sm"
                  checked={engine.soundEnabled}
                  onCheckedChange={engine.setSoundEnabled}
                  aria-label="Sound"
                />
              </label>
            </span>
          </div>
        </div>

        <div className="mv-deck">
          <div className="mv-deck-col mv-deck-goal">
            <GoalPicker
              selectedGoal={engine.selectedGoal}
              onSelect={engine.setGoal}
            />
          </div>
        </div>

        <div className="mv-advanced">
          <DurationStepper
            view={view}
            activePresetId={engine.activePresetId}
            onAdjust={engine.adjust}
            label="Show advanced options"
          />
        </div>

        <div className="mv-history-offscreen">
          <HistoryPanel sessionSavedRevision={sessionSavedRevision} />
        </div>
      </section>
    </div>
  );
}
