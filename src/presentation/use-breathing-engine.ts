"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApplyPreset } from "@/application/apply-preset";
import { BreathingPreferences } from "@/domain/breathing-preferences";
import { BreathingSettings } from "@/domain/breathing-settings";
import {
  DEFAULT_PRESET_ID,
  findPresetById,
  matchPresetId,
  type BreathingPresetDto,
  type BreathingPresetId,
} from "@/domain/breathing-preset";
import {
  advanceBreathingState,
  createIdleBreathingState,
  currentPhase,
  pauseBreathing,
  resetBreathing,
  startBreathing,
  type BreathingEngineState,
} from "@/domain/breathing-engine";
import type { Phase } from "@/domain/phase";
import { rampToDto, type Ramp } from "@/domain/ramp";
import { inhaleTopOffBoundary } from "@/domain/technique";
import {
  sessionGoalToDto,
  type SessionGoal,
} from "@/domain/session-goal";
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
  const [activePresetId, setActivePresetId] =
    useState<BreathingPresetId>(DEFAULT_PRESET_ID);
  const [selectedGoal, setSelectedGoal] = useState<SessionGoal>(null);
  const [activeGoal, setActiveGoal] = useState<SessionGoal>(null);
  const [selectedRamp, setSelectedRamp] = useState<Ramp>(null);
  const [activeRamp, setActiveRamp] = useState<Ramp>(null);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pulseNonce, setPulseNonce] = useState(0);
  const [activeTopOffSeconds, setActiveTopOffSeconds] =
    useState<number | null>(null);
  const [activeAlternateNostrils, setActiveAlternateNostrils] = useState(false);
  const [activePreset, setActivePreset] = useState<BreathingPresetDto | null>(null);

  const engineRef = useRef(engine);
  const settingsRef = useRef(settings);
  const activePresetIdRef = useRef(activePresetId);
  const activeTopOffSecondsRef = useRef(activeTopOffSeconds);
  const activeAlternateNostrilsRef = useRef(activeAlternateNostrils);
  const activePresetRef = useRef(activePreset);
  const topOffFiredRef = useRef(false);
  const selectedGoalRef = useRef(selectedGoal);
  const activeGoalRef = useRef(activeGoal);
  const selectedRampRef = useRef(selectedRamp);
  const activeRampRef = useRef(activeRamp);
  const sessionIdRef = useRef<string | null>(null);
  const sessionSavedRef = useRef(false);
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
    activePresetIdRef.current = activePresetId;
    selectedGoalRef.current = selectedGoal;
    activeGoalRef.current = activeGoal;
    selectedRampRef.current = selectedRamp;
    activeRampRef.current = activeRamp;
    activeTopOffSecondsRef.current = activeTopOffSeconds;
    activeAlternateNostrilsRef.current = activeAlternateNostrils;
    activePresetRef.current = activePreset;
    soundRef.current = soundEnabled;
  }, [
    engine,
    settings,
    activePresetId,
    selectedGoal,
    activeGoal,
    selectedRamp,
    activeRamp,
    activeTopOffSeconds,
    activeAlternateNostrils,
    activePreset,
    soundEnabled,
  ]);

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

  const currentPreferences = useCallback((): ReturnType<BreathingPreferences["toDto"]> => {
    return {
      durations: settingsRef.current.toDto(),
      goal: sessionGoalToDto(selectedGoalRef.current),
      ramp: rampToDto(selectedRampRef.current),
    };
  }, []);

  const flushSettingsSave = useCallback((options?: { keepalive?: boolean }) => {
    const persistence = persistenceRef.current;
    if (persistTimerRef.current !== null) {
      cancelRef.current(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    if (!persistence || !settingsDirtyRef.current) return;
    settingsDirtyRef.current = false;
    void persistence
      .saveSettings(currentPreferences(), options)
      .catch(() => {});
  }, [currentPreferences]);

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
      void persistence.saveSettings(currentPreferences()).catch(() => {});
    }, SETTINGS_SAVE_DEBOUNCE_MS);
  }, [currentPreferences]);

  const persistSession = useCallback((state: BreathingEngineState) => {
    const persistence = persistenceRef.current;
    const sessionId = sessionIdRef.current;
    if (!persistence || !sessionId || sessionSavedRef.current) return;

    const snapshot = snapshotCompletedSession(
      sessionId,
      state,
      settingsRef.current,
    );
    if (!snapshot) return;

    sessionSavedRef.current = true;
    void persistence.saveSession(snapshot).catch(() => {});
  }, []);

  const cuePhase = useCallback(
    (
      state: BreathingEngineState,
      overridePreset?: BreathingPresetDto | null,
    ) => {
      const preset =
        overridePreset !== undefined ? overridePreset : activePresetRef.current;
      const view = toBreathingViewModel(
        state,
        settingsRef.current,
        activeGoalRef.current,
        activeRampRef.current,
        preset,
      );
      audioRef.current.playPhase(view.phase, soundRef.current);
      setAnnouncement(view.announcement);
      setPulseNonce((nonce) => nonce + 1);
    },
    [],
  );

  const handleCompletion = useCallback((state: BreathingEngineState) => {
    audioRef.current.playCompletion(soundRef.current);
    setAnnouncement("Session complete.");
    persistSession(state);
  }, [persistSession]);

  const start = useCallback(() => {
    const previous = engineRef.current;
    if (previous.status === "running") return;
    audioRef.current.ensure();

    let currentActivePreset = activePresetRef.current;

    if (previous.status === "idle" || previous.status === "completed") {
      const nextActiveGoal = selectedGoalRef.current;
      activeGoalRef.current = nextActiveGoal;
      setActiveGoal(nextActiveGoal);
      const nextActiveRamp = selectedRampRef.current;
      activeRampRef.current = nextActiveRamp;
      setActiveRamp(nextActiveRamp);

      const preset =
        activePresetIdRef.current === "custom"
          ? null
          : findPresetById(activePresetIdRef.current)?.toDto() ?? null;
      currentActivePreset = preset;
      activePresetRef.current = preset;
      setActivePreset(preset);
      const nextTopOffSeconds = preset?.topOffSeconds ?? null;
      activeTopOffSecondsRef.current = nextTopOffSeconds;
      setActiveTopOffSeconds(nextTopOffSeconds);
      const nextAlternateNostrils = preset?.alternateNostrils ?? false;
      activeAlternateNostrilsRef.current = nextAlternateNostrils;
      setActiveAlternateNostrils(nextAlternateNostrils);
      topOffFiredRef.current = false;

      sessionIdRef.current = createSessionIdRef.current();
      sessionSavedRef.current = false;
    }

    const next = startBreathing(previous);
    engineRef.current = next;
    setEngine(next);
    if (previous.status === "idle" || previous.status === "completed") {
      cuePhase(next, currentActivePreset);
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
    const shouldSaveOnReset =
      current.status !== "completed" &&
      !sessionSavedRef.current &&
      current.cycleCount >= 1;
    const snapshot =
      persistence && shouldSaveOnReset
        ? snapshotCompletedSession(
            sessionIdRef.current ?? createSessionIdRef.current(),
            current,
            settingsRef.current,
          )
        : null;
    const next = resetBreathing();
    engineRef.current = next;
    setEngine(next);
    setPulseNonce(0);
    activeGoalRef.current = null;
    setActiveGoal(null);
    activeRampRef.current = null;
    setActiveRamp(null);
    activePresetRef.current = null;
    setActivePreset(null);
    activeTopOffSecondsRef.current = null;
    setActiveTopOffSeconds(null);
    activeAlternateNostrilsRef.current = false;
    setActiveAlternateNostrils(false);
    topOffFiredRef.current = false;
    sessionIdRef.current = null;
    if (snapshot && persistence) {
      sessionSavedRef.current = true;
      void persistence.saveSession(snapshot).catch(() => {});
    }
  }, []);

  const applyPreset = useCallback(
    (presetId: BreathingPresetId) => {
      if (presetId === "custom") return;
      const dto = new ApplyPreset().execute(presetId);
      const next = BreathingSettings.fromDto(dto.durations);
      settingsRef.current = next;
      activePresetIdRef.current = presetId;
      setSettings(next);
      setActivePresetId(presetId);
      const nextGoal: SessionGoal = {
        kind: "cycles",
        cycles: dto.recommendedCycles,
      };
      selectedGoalRef.current = nextGoal;
      setSelectedGoal(nextGoal);
      queueSettingsSave();
    },
    [queueSettingsSave],
  );

  const adjust = useCallback(
    (phase: Phase, direction: number) => {
      const next = settingsRef.current.adjust(phase, direction);
      const nextPresetId = matchPresetId(next.toDto());
      settingsRef.current = next;
      activePresetIdRef.current = nextPresetId;
      setSettings(next);
      setActivePresetId(nextPresetId);
      queueSettingsSave();
    },
    [queueSettingsSave],
  );

  const goalsMatch = useCallback((left: SessionGoal, right: SessionGoal) => {
    if (left === right) return true;
    if (left === null || right === null) return false;
    if (left.kind !== right.kind) return false;
    if (left.kind === "minutes") {
      return right.kind === "minutes" && left.minutes === right.minutes;
    }
    if (left.kind === "cycles") {
      return right.kind === "cycles" && left.cycles === right.cycles;
    }
    return false;
  }, []);

  const setGoal = useCallback(
    (goal: SessionGoal) => {
      const previous = selectedGoalRef.current;
      if (goalsMatch(previous, goal)) return;

      selectedGoalRef.current = goal;
      setSelectedGoal(goal);
      queueSettingsSave();

      const status = engineRef.current.status;
      if (status === "running" || status === "paused") {
        setAnnouncement("Goal will apply on your next session.");
      }
    },
    [goalsMatch, queueSettingsSave],
  );

  const setRamp = useCallback(
    (ramp: Ramp) => {
      if (selectedRampRef.current === ramp) return;

      selectedRampRef.current = ramp;
      setSelectedRamp(ramp);
      queueSettingsSave();

      const status = engineRef.current.status;
      if (status === "running" || status === "paused") {
        setAnnouncement("Ramp will apply on your next session.");
      }
    },
    [queueSettingsSave],
  );

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
        const preferences = BreathingPreferences.fromDto(dto);
        const nextSettings = preferences.settings;
        const nextGoal = preferences.goal;
        const nextRamp = preferences.ramp;
        const current = settingsRef.current;
        const currentGoal = selectedGoalRef.current;
        const currentRamp = selectedRampRef.current;
        const settingsUnchanged =
          nextSettings.inhale === current.inhale &&
          nextSettings.hold === current.hold &&
          nextSettings.exhale === current.exhale &&
          nextSettings.rest === current.rest;
        const goalUnchanged = goalsMatch(nextGoal, currentGoal);
        const rampUnchanged = nextRamp === currentRamp;
        if (settingsUnchanged && goalUnchanged && rampUnchanged) {
          return;
        }
        settingsRef.current = nextSettings;
        selectedGoalRef.current = nextGoal;
        selectedRampRef.current = nextRamp;
        activePresetIdRef.current = matchPresetId(nextSettings.toDto());
        setSettings(nextSettings);
        setSelectedGoal(nextGoal);
        setSelectedRamp(nextRamp);
        setActivePresetId(activePresetIdRef.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adapters.persistence, goalsMatch]);

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
        activeGoalRef.current,
        activeRampRef.current,
      );
      engineRef.current = next;
      setEngine(next);
      if (next.status === "completed") {
        handleCompletion(next);
        return;
      }
      if (next.phaseIndex !== previous.phaseIndex) {
        topOffFiredRef.current = false;
        cuePhase(next);
      } else if (
        currentPhase(next) === "inhale" &&
        activeTopOffSecondsRef.current !== null
      ) {
        const duration =
          next.phaseDurationSeconds ?? settingsRef.current.durationFor("inhale");
        const boundary = inhaleTopOffBoundary(
          activeTopOffSecondsRef.current,
          duration,
        );
        if (
          boundary !== null &&
          !topOffFiredRef.current &&
          next.phaseElapsedSeconds >= boundary
        ) {
          topOffFiredRef.current = true;
          audioRef.current.playTopOff(soundRef.current);
          setAnnouncement("Inhale again.");
          setPulseNonce((nonce) => nonce + 1);
        }
      }
      frameId = rafRef.current(loop);
    };
    frameId = rafRef.current(loop);
    return () => {
      cancelled = true;
      cafRef.current(frameId);
    };
  }, [cuePhase, engine.status, handleCompletion]);

  const view = useMemo(
    () =>
      toBreathingViewModel(
        engine,
        settings,
        activeGoal,
        activeRamp,
        activePreset,
      ),
    [engine, settings, activeGoal, activeRamp, activePreset],
  );

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  return {
    engine,
    settings,
    activePresetId,
    activeTopOffSeconds,
    activeAlternateNostrils,
    activePreset,
    selectedGoal,
    activeGoal,
    selectedRamp,
    activeRamp,
    view,
    soundEnabled,
    announcement,
    pulseNonce,
    start,
    pause,
    reset,
    adjust,
    applyPreset,
    announce,
    setGoal,
    setRamp,
    setSoundEnabled,
  };
}
