import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

  it("clamps duration steppers and restores recommended 4-4-6", () => {
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
