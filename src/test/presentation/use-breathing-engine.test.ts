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
    expect(result.current.view.countdown).toBe("3");
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
    expect(result.current.view.countdown).toBe("3");
    expect(result.current.view.elapsed).toBe("00:01");
  });

  it("resets to idle Start with pending sides and does not play sound by default", () => {
    const frames = createRafStub();
    const audio = {
      ensure: vi.fn(),
      playPhase: vi.fn(),
      playCompletion: vi.fn(),
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

  it("clamps duration steppers and restores recommended 4-4-6-2", () => {
    const { result } = renderHook(() => useBreathingEngine());

    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.adjust("inhale", -1);
    });
    expect(result.current.view.stepperValues.inhale).toBe("2s");
    expect(result.current.view.countdown).toBe("2");
    expect(result.current.activePresetId).toBe("custom");

    act(() => {
      result.current.recommend();
    });
    expect(result.current.view.stepperValues).toEqual({
      inhale: "4s",
      hold: "4s",
      exhale: "6s",
      rest: "2s",
    });
    expect(result.current.activePresetId).toBe("current-calm");
  });

  it("applies presets and marks manual edits as custom", () => {
    const { result } = renderHook(() => useBreathingEngine());

    expect(result.current.activePresetId).toBe("current-calm");

    act(() => {
      result.current.applyPreset("box");
    });
    expect(result.current.activePresetId).toBe("box");
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

  it("keeps the exercise on 4-4-6-2 when initialize fails", async () => {
    const persistence = fakePersistence({
      initialize: vi.fn(async () => {
        throw new Error("offline");
      }),
    });
    const { result } = renderHook(() =>
      useBreathingEngine({
        persistence,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.view.stepperValues).toEqual({
      inhale: "4s",
      hold: "4s",
      exhale: "6s",
      rest: "2s",
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
    expect(result.current.view.stepperValues.inhale).toBe("5s");

    await act(async () => {
      resolveInit({
        durations: { inhale: 8, hold: 8, exhale: 8, rest: 8 },
        goal: null,
        ramp: null,
      });
      await Promise.resolve();
    });

    expect(result.current.view.stepperValues.inhale).toBe("5s");
  });

  it("debounces settings saves by 800 ms and persists recommended defaults", () => {
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
      durations: { inhale: 6, hold: 5, exhale: 6, rest: 2 },
      goal: null,
      ramp: null,
    });

    act(() => {
      result.current.recommend();
    });
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
    });
    expect(saveSettings).toHaveBeenLastCalledWith({
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      goal: null,
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
        durations: { inhale: 5, hold: 4, exhale: 7, rest: 2 },
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
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
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

  it("does not persist a zero-cycle reset and saves completed sessions once per id", () => {
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
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
        persistence: fakePersistence({ saveSession }),
        createSessionId,
      }),
    );

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

  it("resets even when session save throws", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), playCompletion: vi.fn(), context: null },
        persistence: fakePersistence({
          saveSession: vi.fn(async () => {
            throw new Error("offline");
          }),
        }),
        createSessionId: () => SESSION_A,
      }),
    );

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

  it("auto-completes a cycle goal, saves once, and does not save again on reset", () => {
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
          context: null,
        },
        persistence: fakePersistence({ saveSession }),
        createSessionId: () => SESSION_A,
      }),
    );

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

    // Default 4-4-6-2 cycle is 16s; by cycle 2's exhale Wind Down adds +1s.
    completeCycles(frames, 41);

    expect(result.current.view.phase).toBe("exhale");
    expect(result.current.view.displayedDuration).toBe(7);
    expect(result.current.view.rampHint).toBe("Exhale now 7s");
  });
});
