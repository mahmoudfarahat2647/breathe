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
import {
  SETTINGS_SAVE_DEBOUNCE_MS,
  type BreathingPersistence,
} from "./persistence";
import { snapshotCompletedSession } from "./session-snapshot";
import { toBreathingViewModel } from "./view-model";

export type BreathingEngineAdapters = {
  raf?: typeof requestAnimationFrame;
  caf?: typeof cancelAnimationFrame;
  audio?: BreathingAudio;
  persistence?: BreathingPersistence;
  createSessionId?: () => string;
  schedule?: (callback: () => void, delayMs: number) => number;
  cancel?: (id: number) => void;
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
  const settingsDirtyRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const persistenceRef = useRef(adapters.persistence);
  const audioRef = useRef<BreathingAudio>(
    adapters.audio ?? createBreathingAudio(),
  );
  const rafRef = useRef<(cb: FrameRequestCallback) => number>(
    adapters.raf ?? ((cb) => requestAnimationFrame(cb)),
  );
  const cafRef = useRef<(id: number) => void>(
    adapters.caf ?? ((id) => cancelAnimationFrame(id)),
  );
  const createSessionIdRef = useRef(
    adapters.createSessionId ?? (() => crypto.randomUUID()),
  );
  const scheduleRef = useRef(
    adapters.schedule ??
      ((callback: () => void, delayMs: number) =>
        window.setTimeout(callback, delayMs)),
  );
  const cancelRef = useRef(
    adapters.cancel ?? ((id: number) => window.clearTimeout(id)),
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
    persistenceRef.current = adapters.persistence;
    if (adapters.createSessionId) {
      createSessionIdRef.current = adapters.createSessionId;
    }
    if (adapters.schedule) scheduleRef.current = adapters.schedule;
    if (adapters.cancel) cancelRef.current = adapters.cancel;
  }, [
    adapters.audio,
    adapters.caf,
    adapters.cancel,
    adapters.createSessionId,
    adapters.persistence,
    adapters.raf,
    adapters.schedule,
  ]);

  const flushSettingsSave = useCallback((options?: { keepalive?: boolean }) => {
    const persistence = persistenceRef.current;
    if (persistTimerRef.current !== null) {
      cancelRef.current(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    if (!persistence || !settingsDirtyRef.current) return;
    settingsDirtyRef.current = false;
    void persistence
      .saveSettings(settingsRef.current.toDto(), options)
      .catch(() => {});
  }, []);

  const queueSettingsSave = useCallback(() => {
    const persistence = persistenceRef.current;
    if (!persistence) return;
    settingsDirtyRef.current = true;
    if (persistTimerRef.current !== null) {
      cancelRef.current(persistTimerRef.current);
    }
    persistTimerRef.current = scheduleRef.current(() => {
      persistTimerRef.current = null;
      if (!settingsDirtyRef.current) return;
      settingsDirtyRef.current = false;
      void persistence.saveSettings(settingsRef.current.toDto()).catch(() => {});
    }, SETTINGS_SAVE_DEBOUNCE_MS);
  }, []);

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
    const persistence = persistenceRef.current;
    const current = engineRef.current;
    const snapshot =
      persistence && current.cycleCount >= 1
        ? snapshotCompletedSession(
            createSessionIdRef.current(),
            current,
            settingsRef.current,
          )
        : null;
    const next = resetBreathing();
    engineRef.current = next;
    setEngine(next);
    setPulseNonce(0);
    if (snapshot && persistence) {
      void persistence.saveSession(snapshot).catch(() => {});
    }
  }, []);

  const adjust = useCallback(
    (phase: Phase, direction: number) => {
      setSettings((current) => {
        const next = current.adjust(phase, direction);
        settingsRef.current = next;
        return next;
      });
      queueSettingsSave();
    },
    [queueSettingsSave],
  );

  const recommend = useCallback(() => {
    const next = BreathingSettings.default();
    settingsRef.current = next;
    setSettings(next);
    queueSettingsSave();
  }, [queueSettingsSave]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundRef.current = enabled;
    setSoundEnabledState(enabled);
    if (enabled) audioRef.current.ensure();
  }, []);

  useEffect(() => {
    const persistence = persistenceRef.current;
    if (!persistence) return;
    let cancelled = false;
    void persistence
      .initialize()
      .then((dto) => {
        if (cancelled || settingsDirtyRef.current) return;
        if (engineRef.current.status !== "idle") return;
        const next = BreathingSettings.fromDto(dto);
        const current = settingsRef.current;
        if (
          next.inhale === current.inhale &&
          next.hold === current.hold &&
          next.exhale === current.exhale
        ) {
          return;
        }
        settingsRef.current = next;
        setSettings(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adapters.persistence]);

  useEffect(() => {
    const onPageHide = () => {
      flushSettingsSave({ keepalive: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushSettingsSave();
    };
  }, [flushSettingsSave]);

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
