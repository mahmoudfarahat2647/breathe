import { describe, expect, it, vi } from "vitest";

import { createBreathingAudio } from "@/presentation/audio";

function fakeAudioContext() {
  const oscillators: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  class FakeAudioContext {
    currentTime = 10;
    state = "suspended";
    destination = { kind: "destination" };
    resume = vi.fn(() => {
      this.state = "running";
      return Promise.resolve();
    });
    createOscillator() {
      const osc = {
        type: "",
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }

  return { FakeAudioContext, oscillators };
}

describe("createBreathingAudio", () => {
  it("does not construct an AudioContext until a user gesture", () => {
    const { FakeAudioContext } = fakeAudioContext();
    const construct = vi.fn(() => new FakeAudioContext());
    const audio = createBreathingAudio({
      Context: construct as unknown as typeof AudioContext,
    });

    audio.playPhase("inhale", false);
    expect(construct).not.toHaveBeenCalled();
  });

  it("creates and resumes the context after ensure()", () => {
    const { FakeAudioContext } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });

    audio.ensure();
    expect(audio.context).not.toBeNull();
    expect(audio.context?.state).toBe("running");
  });

  it("plays inhale rising 220→440 for 0.5s when sound is on", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playPhase("inhale", true);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(220, 10);
    expect(oscillators[0]?.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
      440,
      10.5,
    );
  });

  it("plays hold as a double 392 Hz tap", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playPhase("hold", true);

    expect(oscillators).toHaveLength(2);
    expect(oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(392, 10);
    expect(oscillators[1]?.frequency.setValueAtTime).toHaveBeenCalledWith(
      392,
      10.22,
    );
  });

  it("plays exhale falling 440→180 for 0.7s", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playPhase("exhale", true);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10);
    expect(oscillators[0]?.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
      180,
      10.7,
    );
  });

  it("stays silent for rest even when sound is enabled", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playPhase("rest", true);
    expect(oscillators).toHaveLength(0);
  });

  it("plays a rising completion chime when sound is on", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playCompletion(true);

    expect(oscillators.length).toBeGreaterThanOrEqual(2);
  });

  it("stays silent for completion when sound is disabled", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playCompletion(false);
    expect(oscillators).toHaveLength(0);
  });

  it("stays silent when sound is disabled even after ensure()", () => {
    const { FakeAudioContext, oscillators } = fakeAudioContext();
    const audio = createBreathingAudio({
      Context: FakeAudioContext as unknown as typeof AudioContext,
    });
    audio.ensure();
    audio.playPhase("inhale", false);
    expect(oscillators).toHaveLength(0);
  });
});
