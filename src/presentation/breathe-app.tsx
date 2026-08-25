"use client";

import { useEffect, useRef } from "react";

import { AmbientBackground } from "./ambient-background";
import { BreathingTriangle } from "./breathing-triangle";
import { ControlDeck } from "./control-deck";
import { handleBreathingKeydown } from "./keyboard";
import {
  createHttpBreathingPersistence,
  type BreathingPersistence,
} from "./persistence";
import { useBreathingEngine } from "./use-breathing-engine";

const httpPersistence = createHttpBreathingPersistence();

export function BreatheApp({
  persistence = httpPersistence,
}: {
  persistence?: BreathingPersistence;
} = {}) {
  const engine = useBreathingEngine({ persistence });
  const startRef = useRef<HTMLButtonElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef(engine.engine.status);

  useEffect(() => {
    const previous = statusRef.current;
    const next = engine.engine.status;
    statusRef.current = next;
    if (next === "running" && previous !== "running") {
      pauseRef.current?.focus();
    } else if (next === "paused" && previous === "running") {
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
      <AmbientBackground />

      <header className="app-header">
        <span className="dot" aria-hidden="true" />
        <span>Breathe</span>
        <span className="ar">تنفّس</span>
      </header>

      <main className="stage">
        <BreathingTriangle
          view={engine.view}
          pulse={engine.pulseNonce > 0}
          pulseKey={engine.pulseNonce}
        />
      </main>

      <div className="sr-only" role="status" aria-live="polite">
        {engine.announcement}
      </div>

      <ControlDeck
        view={engine.view}
        soundEnabled={engine.soundEnabled}
        startRef={startRef}
        pauseRef={pauseRef}
        onStart={engine.start}
        onPause={engine.pause}
        onReset={engine.reset}
        onAdjust={engine.adjust}
        onRecommended={engine.recommend}
        onSoundChange={engine.setSoundEnabled}
      />
    </div>
  );
}
