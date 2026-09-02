"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AmbientBackground } from "./ambient-background";
import { BreathingSquare } from "./breathing-square";
import { BreathingTriangle } from "./breathing-triangle";
import { ControlDeck } from "./control-deck";
// PROTOTYPE (issue #17) — remove this import and the variant switch below
// once a Control Deck visual-language direction is picked. Framework-level
// wiring (reading/writing ?variant=) lives in src/app/, not here, per the
// Clean Architecture boundary — presentation stays framework-agnostic even
// for prototype code.
import {
  PrototypeVariantA,
  PrototypeVariantB,
  PrototypeVariantC,
} from "./control-deck.prototype-17";
import { GoalPicker } from "./goal-picker";
import { HistoryPanel } from "./history-panel";
import { handleBreathingKeydown } from "./keyboard";
import {
  createHttpBreathingPersistence,
  type BreathingPersistence,
} from "./persistence";
import { useBreathingEngine } from "./use-breathing-engine";

// PROTOTYPE (issue #17): variantKey "a"|"b"|"c" swaps the Control Deck
// render; "real" (default) renders the current ControlDeck.
const PROTOTYPE_VARIANTS = {
  a: PrototypeVariantA,
  b: PrototypeVariantB,
  c: PrototypeVariantC,
} as const;

const httpPersistence = createHttpBreathingPersistence();

export function BreatheApp({
  persistence = httpPersistence,
  variantKey = "real",
}: {
  persistence?: BreathingPersistence;
  /** PROTOTYPE (issue #17) — remove once resolved. */
  variantKey?: string;
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

  // PROTOTYPE (issue #17): pick which Control Deck render to use. Remove
  // with the import above once resolved.
  const PrototypeVariant =
    PROTOTYPE_VARIANTS[variantKey as keyof typeof PROTOTYPE_VARIANTS];

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

  return (
    <div className={`breathe-root ${engine.view.phaseClass}`}>
      <a className="skip-link" href="#controls">
        Skip to controls
      </a>
      <AmbientBackground />
      <div className="grain" aria-hidden="true" />

      <header className="app-header">
        <span className="dot" aria-hidden="true" />
        <span>Breathe</span>
      </header>

      <main className="stage">
        {engine.settings.rest === 0 ? (
          <BreathingTriangle
            view={engine.view}
            pulse={engine.pulseNonce > 0}
            pulseKey={engine.pulseNonce}
          />
        ) : (
          <BreathingSquare
            view={engine.view}
            pulse={engine.pulseNonce > 0}
            pulseKey={engine.pulseNonce}
          />
        )}
      </main>

      <div className="sr-only" role="status" aria-live="polite">
        {engine.announcement}
      </div>

      {(() => {
        const controlDeckProps = {
          view: engine.view,
          activePresetId: engine.activePresetId,
          soundEnabled: engine.soundEnabled,
          startRef,
          pauseRef,
          onStart: engine.start,
          onPause: engine.pause,
          onReset: engine.reset,
          onAdjust: engine.adjust,
          onSelectPreset: engine.applyPreset,
          onAnnounce: engine.announce,
          onSoundChange: engine.setSoundEnabled,
          goalPicker: (
            <GoalPicker
              selectedGoal={engine.selectedGoal}
              onSelect={engine.setGoal}
            />
          ),
          history: <HistoryPanel sessionSavedRevision={sessionSavedRevision} />,
        };
        // PROTOTYPE (issue #17): swap render based on ?variant=, same props
        // either way — remove this conditional once resolved.
        return PrototypeVariant ? (
          <PrototypeVariant {...controlDeckProps} />
        ) : (
          <ControlDeck {...controlDeckProps} />
        );
      })()}
    </div>
  );
}
