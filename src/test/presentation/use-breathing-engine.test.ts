import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SETTINGS_SAVE_DEBOUNCE_MS,
  type BreathingPersistence,
} from "@/presentation/persistence";
import { useBreathingEngine } from "@/presentation/use-breathing-engine";

function createRafStub() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  return {
    raf(cb: FrameRequestCallback) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    caf(id: number) {
      pending.delete(id);
    },
    flush(now: number) {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback(now);
    },
    get pendingCount() {
      return pending.size;
    },
  };
}

describe("useBreathingEngine", () => {
  it("starts cycle 1 over RAF and pauses without drifting", () => {
    const frames = createRafStub();
    const audio = {
      ensure: vi.fn(),
      playPhase: vi.fn(),
      playCompletion: vi.fn(),
      playTopOff: vi.fn(),
      context: null,
    };

    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio,
      }),
    );

    expect(result.current.view.cycleCount).toBe("0");
    expect(result.current.view.primaryLabel).toBe("Start");

    act(() => {
      result.current.start();
    });
    expect(audio.ensure).toHaveBeenCalled();
    expect(audio.playPhase).toHaveBeenCalledWith("inhale", false);
    expect(result.current.view.cycleCount).toBe("1");
    expect(result.current.view.showPause).toBe(true);

    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_000);
    });
    expect(result.current.view.countdown).toBe("5");
    expect(result.current.view.elapsed).toBe("00:01");

    act(() => {
      result.current.pause();
    });
    expect(result.current.view.primaryLabel).toBe("Resume");
    expect(frames.pendingCount).toBe(0);

    act(() => {
      result.current.start();
    });
    act(() => {
      frames.flush(80_000);
    });
    expect(result.current.view.countdown).toBe("5");
    expect(result.current.view.elapsed).toBe("00:01");
  });

  it("resets to idle Start with pending sides and does not play sound by default", () => {
    const frames = createRafStub();
    const audio = {
      ensure: vi.fn(),
      playPhase: vi.fn(),
      playCompletion: vi.fn(),
      playTopOff: vi.fn(),
      context: null,
    };
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio,
      }),
    );

    act(() => {
      result.current.setGoal({ kind: "minutes", minutes: 5 });
      result.current.start();
    });
    expect(result.current.activeGoal).toEqual({ kind: "minutes", minutes: 5 });
    expect(result.current.view.goalRemaining).toBe("05:00");

    act(() => {
      result.current.reset();
    });

    expect(result.current.activeGoal).toBeNull();
    expect(result.current.view.goalRemaining).toBeNull();
    expect(result.current.view.svgIdle).toBe(true);
    expect(result.current.view.primaryLabel).toBe("Start");
    expect(result.current.view.cycleCount).toBe("0");
    expect(result.current.view.elapsed).toBe("00:00");
    expect(result.current.view.sides.inhale.state).toBe("pending");
    expect(frames.pendingCount).toBe(0);
  });

  it("clamps duration steppers and restores the default Resonance Coherence preset", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.adjust("inhale", -1);
    });
    expect(result.current.view.stepperValues.inhale).toBe("2s");
    expect(result.current.view.countdown).toBe("2");
    expect(result.current.activePresetId).toBe("custom");

    act(() => {
      result.current.applyPreset("resonance-coherence");
    });
    expect(result.current.view.stepperValues).toEqual({
      inhale: "5.5s",
      hold: "0s",
      exhale: "5.5s",
      rest: "0s",
    });
    expect(result.current.activePresetId).toBe("resonance-coherence");
  });

  it("applies presets and marks manual edits as custom", () => {
    const { result } = renderHook(() => useBreathingEngine());

    expect(result.current.activePresetId).toBe("resonance-coherence");

    act(() => {
      result.current.applyPreset("executive-focus");
    });
    expect(result.current.activePresetId).toBe("executive-focus");
    expect(result.current.view.stepperValues).toEqual({
      inhale: "4s",
      hold: "4s",
      exhale: "4s",
      rest: "4s",
    });

    act(() => {
      result.current.adjust("inhale", 1);
    });
    expect(result.current.activePresetId).toBe("custom");
  });

  it("only plays tones after sound is enabled", () => {
    const frames = createRafStub();
    const audio = {
      ensure: vi.fn(),
      playPhase: vi.fn(),
      playCompletion: vi.fn(),
      playTopOff: vi.fn(),
      context: null,
    };
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio,
      }),
    );

    act(() => {
      result.current.start();
    });
    expect(audio.playPhase).toHaveBeenCalledWith("inhale", false);

    act(() => {
      result.current.setSoundEnabled(true);
    });
    expect(audio.ensure).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.reset();
      result.current.start();
    });
    expect(audio.playPhase).toHaveBeenLastCalledWith("inhale", true);
  });
});

const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SESSION_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createScheduleStub() {
  let nextId = 1;
  let now = 0;
  const pending = new Map<number, { callback: () => void; fireAt: number }>();
  return {
    schedule(callback: () => void, delayMs: number) {
      const id = nextId++;
      pending.set(id, { callback, fireAt: now + delayMs });
      return id;
    },
    cancel(id: number) {
      pending.delete(id);
    },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...pending]) {
        if (timer.fireAt <= now) {
          pending.delete(id);
          timer.callback();
        }
      }
    },
  };
}

function fakePersistence(
  overrides: Partial<BreathingPersistence> = {},
): BreathingPersistence {
  return {
    async initialize() {
      return {
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: null,
      };
    },
    async saveSettings() {},
    async saveSession() {},
    ...overrides,
  };
}

function completeCycles(
  frames: ReturnType<typeof createRafStub>,
  seconds: number,
  startMs = 0,
) {
  act(() => {
    frames.flush(startMs);
  });
  for (let elapsed = 1; elapsed <= seconds; elapsed += 1) {
    act(() => {
      frames.flush(startMs + elapsed * 1000);
    });
  }
}

describe("useBreathingEngine persistence", () => {
  it("restores stored durations after initialize", async () => {
    const persistence = fakePersistence({
      initialize: vi.fn(async () => ({
        durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
        goal: { kind: "minutes" as const, minutes: 5 },
        ramp: null,
      })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.view.stepperValues).toEqual({
        inhale: "5s",
        hold: "2s",
        exhale: "8s",
        rest: "3s",
      });
      expect(result.current.selectedGoal).toEqual({ kind: "minutes", minutes: 5 });
    });
  });

  it("loads a saved 4-4-6-2 duration set as Custom without rewriting settings", async () => {
    const saveSettings = vi.fn(async () => {});
    const persistence = fakePersistence({
      saveSettings,
      initialize: vi.fn(async () => ({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: null,
      })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.activePresetId).toBe("custom");
      expect(result.current.view.stepperValues).toEqual({
        inhale: "4s",
        hold: "4s",
        exhale: "6s",
        rest: "2s",
      });
    });

    expect(saveSettings).not.toHaveBeenCalled();
  });

  it("keeps the exercise on the default Resonance Coherence pattern when initialize fails", async () => {
    const persistence = fakePersistence({
      initialize: vi.fn(async () => {
        throw new Error("offline");
      }),
    });
    const { result } = renderHook(() =>
      useBreathingEngine({
        persistence,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), playTopOff: vi.fn(), context: null },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.view.stepperValues).toEqual({
      inhale: "5.5s",
      hold: "0s",
      exhale: "5.5s",
      rest: "0s",
    });

    act(() => {
      result.current.start();
    });
    expect(result.current.view.showPause).toBe(true);
  });

  it("loads a saved rest duration even when inhale, hold, and exhale match defaults", async () => {
    const persistence = fakePersistence({
      initialize: vi.fn(async () => ({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 8 },
        goal: null,
        ramp: null,
      })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.view.stepperValues.rest).toBe("8s");
    });
  });

  it("does not overwrite local edits that happen before initialize resolves", async () => {
    let resolveInit!: (value: {
      durations: { inhale: number; hold: number; exhale: number; rest: number };
      goal: null;
      ramp: null;
    }) => void;
    const persistence = fakePersistence({
      initialize: () =>
        new Promise((resolve) => {
          resolveInit = resolve;
        }),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    act(() => {
      result.current.adjust("inhale", 1);
    });
    expect(result.current.view.stepperValues.inhale).toBe("6s");

    await act(async () => {
      resolveInit({
        durations: { inhale: 8, hold: 8, exhale: 8, rest: 8 },
        goal: null,
        ramp: null,
      });
      await Promise.resolve();
    });

    expect(result.current.view.stepperValues.inhale).toBe("6s");
  });

  it("debounces settings saves by 800 ms and persists default preset selection", () => {
    const clocks = createScheduleStub();
    const saveSettings = vi.fn(async () => {});
    const { result } = renderHook(() =>
      useBreathingEngine({
        persistence: fakePersistence({ saveSettings }),
        schedule: clocks.schedule,
        cancel: clocks.cancel,
      }),
    );

    act(() => {
      result.current.adjust("inhale", 1);
      result.current.adjust("inhale", 1);
      result.current.adjust("hold", 1);
    });
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS - 1);
    });
    expect(saveSettings).not.toHaveBeenCalled();

    act(() => {
      clocks.advance(1);
    });
    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith({
      durations: { inhale: 7, hold: 1, exhale: 5.5, rest: 0 },
      goal: null,
      ramp: null,
    });

    act(() => {
      result.current.applyPreset("resonance-coherence");
    });
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
    });
    expect(saveSettings).toHaveBeenLastCalledWith({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
      goal: { kind: "cycles", cycles: 25 },
      ramp: null,
    });
  });

  it("flushes the latest pending settings save on unmount", () => {
    const clocks = createScheduleStub();
    const saveSettings = vi.fn(async () => {});
    const { result, unmount } = renderHook(() =>
      useBreathingEngine({
        persistence: fakePersistence({ saveSettings }),
        schedule: clocks.schedule,
        cancel: clocks.cancel,
      }),
    );

    act(() => {
      result.current.adjust("inhale", 1);
      result.current.adjust("exhale", 1);
    });
    expect(saveSettings).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith(
      {
        durations: { inhale: 6, hold: 0, exhale: 6, rest: 0 },
        goal: null,
        ramp: null,
      },
      undefined,
    );
  });

  it("debounces settings saves when selecting a ramp", () => {
    const clocks = createScheduleStub();
    const saveSettings = vi.fn(async () => {});
    const { result } = renderHook(() =>
      useBreathingEngine({
        persistence: fakePersistence({ saveSettings }),
        schedule: clocks.schedule,
        cancel: clocks.cancel,
      }),
    );

    act(() => {
      result.current.setRamp("wind-down");
    });
    expect(result.current.selectedRamp).toBe("wind-down");
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
    });

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith({
      durations: { inhale: 5.5, hold: 0, exhale: 5.5, rest: 0 },
      goal: null,
      ramp: "wind-down",
    });
  });

  it("restores stored ramp after initialize", async () => {
    const persistence = fakePersistence({
      initialize: vi.fn(async () => ({
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
        goal: null,
        ramp: "wind-down" as const,
      })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.selectedRamp).toBe("wind-down");
    });
  });

  it("does not persist a zero-cycle reset and saves completed sessions once per id", async () => {
    const frames = createRafStub();
    const saveSession = vi.fn(async () => {});
    const createSessionId = vi
      .fn()
      .mockReturnValueOnce(SESSION_A)
      .mockReturnValueOnce(SESSION_B)
      .mockReturnValueOnce(SESSION_C);
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), playTopOff: vi.fn(), context: null },
        persistence: fakePersistence({ saveSession }),
        createSessionId,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.start();
    });
    completeCycles(frames, 2);
    act(() => {
      result.current.reset();
    });
    expect(saveSession).not.toHaveBeenCalled();

    act(() => {
      result.current.adjust("inhale", 1);
      result.current.start();
    });
    completeCycles(frames, 17);
    expect(result.current.engine.cycleCount).toBe(1);

    act(() => {
      result.current.reset();
    });
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith({
      id: SESSION_B,
      cycleCount: 1,
      elapsedSeconds: expect.any(Number),
      durations: { inhale: 5, hold: 4, exhale: 6, rest: 2 },
    });

    act(() => {
      result.current.start();
    });
    completeCycles(frames, 17);
    act(() => {
      result.current.reset();
    });
    expect(saveSession).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: SESSION_C }),
    );
  });

  it("resets even when session save throws", async () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), playTopOff: vi.fn(), context: null },
        persistence: fakePersistence({
          saveSession: vi.fn(async () => {
            throw new Error("offline");
          }),
        }),
        createSessionId: () => SESSION_A,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.start();
    });
    completeCycles(frames, 16);
    act(() => {
      result.current.reset();
    });

    expect(result.current.view.primaryLabel).toBe("Start");
    expect(result.current.view.elapsed).toBe("00:00");
    expect(result.current.view.svgIdle).toBe(true);
  });

  it("auto-completes a cycle goal, saves once, and does not save again on reset", async () => {
    const frames = createRafStub();
    const saveSession = vi.fn(async () => {});
    const playCompletion = vi.fn();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: {
          ensure: vi.fn(),
          playPhase: vi.fn(),
          playCompletion,
          playTopOff: vi.fn(),
          context: null,
        },
        persistence: fakePersistence({ saveSession }),
        createSessionId: () => SESSION_A,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setGoal({ kind: "cycles", cycles: 1 });
      result.current.start();
    });

    completeCycles(frames, 16);
    expect(result.current.engine.status).toBe("completed");
    expect(result.current.view.isCompleted).toBe(true);
    expect(frames.pendingCount).toBe(0);
    expect(playCompletion).toHaveBeenCalledWith(false);
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith({
      id: SESSION_A,
      cycleCount: 1,
      elapsedSeconds: expect.any(Number),
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });

    act(() => {
      result.current.reset();
    });
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(result.current.view.svgIdle).toBe(true);
  });

  it("leaves session uncompleted after failed save and retries save on subsequent trigger", async () => {
    const frames = createRafStub();
    const saveSession = vi
      .fn()
      .mockRejectedValueOnce(new Error("500 Internal Server Error"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: {
          ensure: vi.fn(),
          playPhase: vi.fn(),
          playCompletion: vi.fn(),
          playTopOff: vi.fn(),
          context: null,
        },
        persistence: fakePersistence({ saveSession }),
        createSessionId: () => SESSION_A,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setGoal({ kind: "cycles", cycles: 1 });
      result.current.start();
    });

    // Complete cycle 1 to trigger auto-complete and first save attempt
    completeCycles(frames, 16);
    expect(result.current.engine.status).toBe("completed");
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenLastCalledWith({
      id: SESSION_A,
      cycleCount: 1,
      elapsedSeconds: expect.any(Number),
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });

    // Wait for the rejected save promise to settle
    await act(async () => {
      await Promise.resolve();
    });

    // Subsequent trigger: Reset after failed save.
    // The engine must NOT have marked the session saved, so reset retries saving SESSION_A.
    act(() => {
      result.current.reset();
    });

    expect(saveSession).toHaveBeenCalledTimes(2);
    expect(saveSession).toHaveBeenLastCalledWith({
      id: SESSION_A,
      cycleCount: 1,
      elapsedSeconds: expect.any(Number),
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });

    // Wait for the second save promise to settle
    await act(async () => {
      await Promise.resolve();
    });

    // Once successfully saved, an additional reset does NOT attempt another save
    act(() => {
      result.current.reset();
    });
    expect(saveSession).toHaveBeenCalledTimes(2);
  });

  it("guards against concurrent double-submission while a save is in flight", async () => {
    const frames = createRafStub();
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const saveSession = vi.fn().mockImplementation(() => savePromise);

    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: {
          ensure: vi.fn(),
          playPhase: vi.fn(),
          playCompletion: vi.fn(),
          playTopOff: vi.fn(),
          context: null,
        },
        persistence: fakePersistence({ saveSession }),
        createSessionId: () => SESSION_A,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setGoal({ kind: "cycles", cycles: 1 });
      result.current.start();
    });

    completeCycles(frames, 16);
    expect(saveSession).toHaveBeenCalledTimes(1);

    // Concurrently trigger reset while save is still in flight
    act(() => {
      result.current.reset();
    });
    // Must NOT double-submit concurrently
    expect(saveSession).toHaveBeenCalledTimes(1);

    // Resolve the in-flight save
    await act(async () => {
      resolveSave();
      await Promise.resolve();
    });

    expect(saveSession).toHaveBeenCalledTimes(1);
  });

  it("prevents stale resolution of an earlier session from marking a new session as already saved", async () => {
    const frames = createRafStub();
    let resolveSessionA!: () => void;
    const sessionAPromise = new Promise<void>((resolve) => {
      resolveSessionA = resolve;
    });

    const saveSession = vi
      .fn()
      .mockImplementationOnce(() => sessionAPromise)
      .mockImplementationOnce(async () => {});

    const createSessionId = vi
      .fn()
      .mockReturnValueOnce(SESSION_A)
      .mockReturnValueOnce(SESSION_B);

    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: {
          ensure: vi.fn(),
          playPhase: vi.fn(),
          playCompletion: vi.fn(),
          playTopOff: vi.fn(),
          context: null,
        },
        persistence: fakePersistence({ saveSession }),
        createSessionId,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Start session A with goal of 1 cycle
    act(() => {
      result.current.setGoal({ kind: "cycles", cycles: 1 });
      result.current.start();
    });

    // Complete session A; saveSession is dispatched for SESSION_A and remains in flight
    completeCycles(frames, 16);
    expect(result.current.engine.status).toBe("completed");
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: SESSION_A }),
    );

    // Start new session B before session A's save promise settles
    act(() => {
      result.current.start();
    });
    expect(result.current.engine.status).toBe("running");

    // Settle session A's save promise successfully
    await act(async () => {
      resolveSessionA();
      await Promise.resolve();
    });

    // Complete session B (cycle 1)
    completeCycles(frames, 16);
    expect(result.current.engine.status).toBe("completed");

    // Assert that session B was NOT skipped: the stale resolution of session A
    // must not mark session B as already saved.
    expect(saveSession).toHaveBeenCalledTimes(2);
    expect(saveSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: SESSION_B }),
    );
  });

  it("announces that a mid-session goal change applies on the next run", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: {
          ensure: vi.fn(),
          playPhase: vi.fn(),
          playCompletion: vi.fn(),
          playTopOff: vi.fn(),
          context: null,
        },
      }),
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setGoal({ kind: "minutes", minutes: 5 });
    });
    expect(result.current.announcement).toBe(
      "Goal will apply on your next session.",
    );
  });
});

describe("useBreathingEngine ramp", () => {
  const silentAudio = () => ({
    ensure: vi.fn(),
    playPhase: vi.fn(),
    playCompletion: vi.fn(),
    playTopOff: vi.fn(),
    context: null,
  });

  it("holds a mid-session Ramp change until the next Reset + Start", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio: silentAudio() }),
    );

    act(() => {
      result.current.start();
    });
    completeCycles(frames, 3);

    act(() => {
      result.current.setRamp("wind-down");
    });
    expect(result.current.selectedRamp).toBe("wind-down");
    expect(result.current.activeRamp).toBeNull();
    expect(result.current.announcement).toBe(
      "Ramp will apply on your next session.",
    );

    act(() => {
      result.current.reset();
    });
    expect(result.current.activeRamp).toBeNull();

    act(() => {
      result.current.start();
    });
    expect(result.current.activeRamp).toBe("wind-down");
  });

  it("shows no ramp hint while idle", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      result.current.setRamp("wind-down");
    });

    expect(result.current.view.rampHint).toBeNull();
  });

  it("shows no ramp hint after a manual mid-phase duration edit when the Ramp is Off", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio: silentAudio() }),
    );

    act(() => {
      result.current.start();
    });
    completeCycles(frames, 1);

    act(() => {
      result.current.adjust("inhale", -1);
      result.current.adjust("inhale", -1);
    });

    // The snapshotted phase duration now exceeds the (just-lowered) base...
    expect(result.current.view.displayedDuration).toBeGreaterThan(
      result.current.settings.inhale,
    );
    // ...but with the Ramp Off there must be no hint.
    expect(result.current.activeRamp).toBeNull();
    expect(result.current.view.rampHint).toBeNull();
  });

  it("shows the ramped exhale hint once Wind Down has stepped up", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio: silentAudio() }),
    );

    act(() => {
      result.current.setRamp("wind-down");
      result.current.start();
    });
    expect(result.current.activeRamp).toBe("wind-down");

    // Default Resonance Coherence cycle is 11s (5.5 inhale + 5.5 exhale, no
    // hold/rest); by cycle 2's exhale, Wind Down has stepped once (floor(2/2)=1),
    // adding +1s to the 5.5s base exhale.
    completeCycles(frames, 28);

    expect(result.current.view.phase).toBe("exhale");
    expect(result.current.view.displayedDuration).toBe(6.5);
    expect(result.current.view.rampHint).toBe("Exhale now 6.5s");
  });
});

describe("useBreathingEngine applyPreset", () => {
  it("keeps selectedGoal as null on a fresh hook mount", () => {
    const { result } = renderHook(() => useBreathingEngine());
    expect(result.current.selectedGoal).toBeNull();
  });

  it("sets selectedGoal to recommendedCycles, updates activePresetId, and leaves announcement empty", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      result.current.applyPreset("executive-focus");
    });

    expect(result.current.selectedGoal).toEqual({
      kind: "cycles",
      cycles: 12,
    });
    expect(result.current.activePresetId).toBe("executive-focus");
    expect(result.current.announcement).toBe("");
  });

  it.each(["idle", "running", "paused", "completed"] as const)(
    "silently applies preset without announcement in %s state",
    (status) => {
      const frames = createRafStub();
      const { result } = renderHook(() =>
        useBreathingEngine({
          raf: frames.raf,
          caf: frames.caf,
          audio: {
            ensure: vi.fn(),
            playPhase: vi.fn(),
            playCompletion: vi.fn(),
            playTopOff: vi.fn(),
            context: null,
          },
        }),
      );

      if (status === "running") {
        act(() => {
          result.current.start();
        });
      } else if (status === "paused") {
        act(() => {
          result.current.start();
        });
        act(() => {
          result.current.pause();
        });
      } else if (status === "completed") {
        act(() => {
          result.current.setGoal({ kind: "cycles", cycles: 1 });
          result.current.start();
        });
        completeCycles(frames, 16);
      }

      expect(result.current.engine.status).toBe(status);
      const previousAnnouncement = result.current.announcement;

      act(() => {
        result.current.applyPreset("mood-elevation");
      });

      expect(result.current.announcement).toBe(previousAnnouncement);
      expect(result.current.announcement).not.toBe(
        "Goal will apply on your next session.",
      );
      expect(result.current.selectedGoal).toEqual({
        kind: "cycles",
        cycles: 10,
      });
      expect(result.current.activePresetId).toBe("mood-elevation");
    },
  );
});

describe("useBreathingEngine technique cues", () => {
  const silentAudioWithSpies = () => ({
    ensure: vi.fn(),
    playPhase: vi.fn(),
    playCompletion: vi.fn(),
    playTopOff: vi.fn(),
    context: null,
  });

  it("fires the top-off cue once per inhale at the ramp-adjusted boundary when Slow Down lengthens inhale", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("acute-de-stress"); // inhale 3s, topOff 1s -> base boundary 2s
      result.current.setRamp("slow-down"); // lengthens inhale +1s every 3 cycles
      result.current.start();
    });

    // Inhale 0 to 1.9s: before boundary
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_000);
    });
    act(() => {
      frames.flush(1_900);
    });
    expect(audio.playTopOff).not.toHaveBeenCalled();

    // Cross boundary at 2.0s
    act(() => {
      frames.flush(2_000);
    });
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);
    expect(result.current.announcement).toBe("Inhale again.");

    // Advance to cycle 3 where slow-down has lengthened inhale from 3s to 4s:
    // Cycle is (3+0+6+1) = 10s. Cycles 0, 1, 2 take 30s.
    // By 31s, engine is in cycle 3 inhale, lengthened to 4s.
    // Boundary is now 4 - 1 = 3s into the phase (elapsed 34s).
    for (let sec = 3; sec <= 32; sec++) {
      act(() => {
        frames.flush(sec * 1000);
      });
    }
    expect(result.current.view.phase).toBe("inhale");
    expect(result.current.view.displayedDuration).toBe(4);

    // At 32s (2s into 4s inhale), base boundary (2s) is reached, but the ramped boundary (3s) is NOT:
    // playTopOff has only been called for previous inhales (cycles 0, 1, 2 = 3 times total)
    expect(audio.playTopOff).toHaveBeenCalledTimes(3);

    // Now advance to 33s (3s into 4s inhale) - crosses the ramped 3s boundary!
    act(() => {
      frames.flush(33_000);
    });
    expect(audio.playTopOff).toHaveBeenCalledTimes(4);
  });

  it("does not double-fire across a pause/resume that straddles the boundary", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("acute-de-stress"); // boundary at 2s
      result.current.start();
    });

    // Advance to 1.5s, then pause
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_500);
    });
    expect(audio.playTopOff).not.toHaveBeenCalled();

    act(() => {
      result.current.pause();
    });
    expect(audio.playTopOff).not.toHaveBeenCalled();

    // Resume and cross boundary
    act(() => {
      result.current.start();
    });
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_000); // 1.5s + 1s = 2.5s, crosses 2s boundary
    });
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);

    // Pause again after firing, then resume
    act(() => {
      result.current.pause();
    });
    act(() => {
      result.current.start();
    });
    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(200); // 2.7s
    });
    // Must NOT fire again in the same inhale!
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);
  });

  it("is absent entirely when the preset has no top-off metadata", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("executive-focus"); // no top-off
      result.current.start();
    });

    expect(result.current.activeTopOffSeconds).toBeNull();
    expect(result.current.activeAlternateNostrils).toBe(false);

    // Advance through entire inhale (4s)
    for (let t = 0; t <= 4_000; t += 500) {
      act(() => {
        frames.flush(t);
      });
    }
    expect(audio.playTopOff).not.toHaveBeenCalled();
    expect(result.current.view.topOffFraction).toBeNull();
  });

  it("drives technique cues from captured activePreset, never from mid-session picks", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("acute-de-stress"); // topOff 1s
      result.current.start();
    });

    expect(result.current.activeTopOffSeconds).toBe(1);

    // Mid-session pick of a preset with NO top-off:
    act(() => {
      result.current.applyPreset("executive-focus");
    });
    expect(result.current.activePresetId).toBe("executive-focus");
    // Running session still retains captured top-off!
    expect(result.current.activeTopOffSeconds).toBe(1);

    act(() => {
      frames.flush(0);
    });
    act(() => {
      frames.flush(1_000);
    });
    act(() => {
      frames.flush(2_000);
    });
    expect(audio.playTopOff).not.toHaveBeenCalled();

    act(() => {
      frames.flush(3_000);
    });
    // Top-off cue fires at 3s (4s inhale - 1s top-off) because the session's captured preset had topOffSeconds!
    expect(audio.playTopOff).toHaveBeenCalledTimes(1);
  });

  it("alternates nostril cue by completed cycle parity for alternateNostrils preset", () => {
    const frames = createRafStub();
    const audio = silentAudioWithSpies();
    const { result } = renderHook(() =>
      useBreathingEngine({ raf: frames.raf, caf: frames.caf, audio }),
    );

    act(() => {
      result.current.applyPreset("mood-elevation"); // alternateNostrils: true, 4/2/6/1
      result.current.start();
    });

    expect(result.current.activeAlternateNostrils).toBe(true);

    // Cycle 0 Inhale: Left nostril
    expect(result.current.view.phase).toBe("inhale");
    expect(result.current.view.techniqueHint).toBe("Left nostril");
    expect(result.current.announcement).toContain("Left nostril");

    // Advance to hold: 4s into cycle
    act(() => {
      frames.flush(0);
    });
    completeCycles(frames, 4); // enters hold
    expect(result.current.view.phase).toBe("hold");
    expect(result.current.view.techniqueHint).toBeNull();
    expect(result.current.announcement).not.toContain("nostril");

    // Advance to exhale: 6s into cycle
    completeCycles(frames, 2); // enters exhale
    expect(result.current.view.phase).toBe("exhale");
    expect(result.current.view.techniqueHint).toBe("Right nostril");
    expect(result.current.announcement).toContain("Right nostril");

    // Complete cycle 0 (exhale 6s + rest 1s = 7s) -> enters cycle 1 Inhale
    completeCycles(frames, 7);
    expect(result.current.view.phase).toBe("inhale");
    expect(result.current.engine.cycleCount).toBe(1);
    // Cycle 1 Inhale: swapped to Right nostril!
    expect(result.current.view.techniqueHint).toBe("Right nostril");
    expect(result.current.announcement).toContain("Right nostril");
  });
});

