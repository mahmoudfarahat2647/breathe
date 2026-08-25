"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BreathingSettings } from "@/domain/breathing-settings";
import {
  advanceBreathingState,
  createIdleBreathingState,
  pauseBreathing,
  resetBreathing,
  startBreathing,
  type BreathingEngineState,
} from "@/domain/breathing-engine";
import type { Phase } from "@/domain/phase";
import {
  createBreathingAudio,
  type BreathingAudio,
} from "./audio";
import { toBreathingViewModel } from "./view-model";

export type BreathingEngineAdapters = {
  raf?: typeof requestAnimationFrame;
  caf?: typeof cancelAnimationFrame;
  audio?: BreathingAudio;
};

export function useBreathingEngine(adapters: BreathingEngineAdapters = {}) {
  const [engine, setEngine] = useState<BreathingEngineState>(
    createIdleBreathingState,
  );
  const [settings, setSettings] = useState(BreathingSettings.default);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pulseNonce, setPulseNonce] = useState(0);

  const engineRef = useRef(engine);
  const settingsRef = useRef(settings);
  const soundRef = useRef(soundEnabled);
  const audioRef = useRef<BreathingAudio>(
    adapters.audio ?? createBreathingAudio(),
  );
  const rafRef = useRef<(cb: FrameRequestCallback) => number>(
    adapters.raf ?? ((cb) => requestAnimationFrame(cb)),
  );
  const cafRef = useRef<(id: number) => void>(
    adapters.caf ?? ((id) => cancelAnimationFrame(id)),
  );

  useEffect(() => {
    engineRef.current = engine;
    settingsRef.current = settings;
    soundRef.current = soundEnabled;
  }, [engine, settings, soundEnabled]);

  useEffect(() => {
    if (adapters.audio) audioRef.current = adapters.audio;
    if (adapters.raf) rafRef.current = adapters.raf;
    if (adapters.caf) cafRef.current = adapters.caf;
  }, [adapters.audio, adapters.caf, adapters.raf]);

  const cuePhase = useCallback((state: BreathingEngineState) => {
    const view = toBreathingViewModel(state, settingsRef.current);
    audioRef.current.playPhase(view.phase, soundRef.current);
    setAnnouncement(view.announcement);
    setPulseNonce((nonce) => nonce + 1);
  }, []);

  const start = useCallback(() => {
    const previous = engineRef.current;
    if (previous.status === "running") return;
    audioRef.current.ensure();
    const next = startBreathing(previous);
    engineRef.current = next;
    setEngine(next);
    if (previous.status === "idle") {
      cuePhase(next);
    }
  }, [cuePhase]);

  const pause = useCallback(() => {
    const next = pauseBreathing(engineRef.current);
    engineRef.current = next;
    setEngine(next);
  }, []);

  const reset = useCallback(() => {
    const next = resetBreathing();
    engineRef.current = next;
    setEngine(next);
    setPulseNonce(0);
  }, []);

  const adjust = useCallback((phase: Phase, direction: number) => {
    setSettings((current) => {
      const next = current.adjust(phase, direction);
      settingsRef.current = next;
      return next;
    });
  }, []);

  const recommend = useCallback(() => {
    const next = BreathingSettings.default();
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundRef.current = enabled;
    setSoundEnabledState(enabled);
    if (enabled) audioRef.current.ensure();
  }, []);

  useEffect(() => {
    if (engine.status !== "running") return;
    let frameId = 0;
    let cancelled = false;
    const loop = (now: number) => {
      if (cancelled) return;
      const previous = engineRef.current;
      const next = advanceBreathingState(
        previous,
        now,
        settingsRef.current,
      );
      engineRef.current = next;
      setEngine(next);
      if (next.phaseIndex !== previous.phaseIndex) {
        cuePhase(next);
      }
      frameId = rafRef.current(loop);
    };
    frameId = rafRef.current(loop);
    return () => {
      cancelled = true;
      cafRef.current(frameId);
    };
  }, [cuePhase, engine.status]);

  const view = useMemo(
    () => toBreathingViewModel(engine, settings),
    [engine, settings],
  );

  return {
    engine,
    settings,
    view,
    soundEnabled,
    announcement,
    pulseNonce,
    start,
    pause,
    reset,
    adjust,
    recommend,
    setSoundEnabled,
  };
}
