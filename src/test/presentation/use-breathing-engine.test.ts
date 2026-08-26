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
    act(() => {
      result.current.reset();
    });

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

    act(() => {
      result.current.recommend();
    });
    expect(result.current.view.stepperValues).toEqual({
      inhale: "4s",
      hold: "4s",
      exhale: "6s",
      rest: "2s",
    });
  });

  it("only plays tones after sound is enabled", () => {
    const frames = createRafStub();
    const audio = {
      ensure: vi.fn(),
      playPhase: vi.fn(),
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
      return { inhale: 4, hold: 4, exhale: 6, rest: 2 };
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
      initialize: vi.fn(async () => ({ inhale: 5, hold: 2, exhale: 8, rest: 3 })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.view.stepperValues).toEqual({
        inhale: "5s",
        hold: "2s",
        exhale: "8s",
        rest: "3s",
      });
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
        audio: { ensure: vi.fn(), playPhase: vi.fn(), context: null },
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
      initialize: vi.fn(async () => ({ inhale: 4, hold: 4, exhale: 6, rest: 8 })),
    });
    const { result } = renderHook(() => useBreathingEngine({ persistence }));

    await waitFor(() => {
      expect(result.current.view.stepperValues.rest).toBe("8s");
    });
  });

  it("does not overwrite local edits that happen before initialize resolves", async () => {
    let resolveInit!: (value: {
      inhale: number;
      hold: number;
      exhale: number;
      rest: number;
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
      resolveInit({ inhale: 8, hold: 8, exhale: 8, rest: 8 });
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
      inhale: 6,
      hold: 5,
      exhale: 6,
      rest: 2,
    });

    act(() => {
      result.current.recommend();
    });
    act(() => {
      clocks.advance(SETTINGS_SAVE_DEBOUNCE_MS);
    });
    expect(saveSettings).toHaveBeenLastCalledWith({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
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
      { inhale: 5, hold: 4, exhale: 7, rest: 2 },
      undefined,
    );
  });

  it("does not persist a zero-cycle reset and saves completed sessions once per id", () => {
    const frames = createRafStub();
    const saveSession = vi.fn(async () => {});
    const createSessionId = vi
      .fn()
      .mockReturnValueOnce(SESSION_A)
      .mockReturnValueOnce(SESSION_B);
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), context: null },
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
      id: SESSION_A,
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
      expect.objectContaining({ id: SESSION_B }),
    );
  });

  it("resets even when session save throws", () => {
    const frames = createRafStub();
    const { result } = renderHook(() =>
      useBreathingEngine({
        raf: frames.raf,
        caf: frames.caf,
        audio: { ensure: vi.fn(), playPhase: vi.fn(), context: null },
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
});
