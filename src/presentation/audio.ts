import type { Phase } from "@/domain/phase";

export type AudioContextLike = {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
};

type OscillatorNodeLike = {
  type: string;
  frequency: {
    setValueAtTime(value: number, time: number): void;
    linearRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
  start(time: number): void;
  stop(time: number): void;
};

type GainNodeLike = {
  gain: {
    setValueAtTime(value: number, time: number): void;
    linearRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
};

type AudioContextCtor = new () => AudioContextLike;

const PHASE_TONES: Record<
  Phase,
  ReadonlyArray<{
    start: number;
    end: number;
    duration: number;
    delay: number;
  }>
> = {
  inhale: [{ start: 220, end: 440, duration: 0.5, delay: 0 }],
  hold: [
    { start: 392, end: 392, duration: 0.16, delay: 0 },
    { start: 392, end: 392, duration: 0.16, delay: 0.22 },
  ],
  exhale: [{ start: 440, end: 180, duration: 0.7, delay: 0 }],
  rest: [],
};

export function createBreathingAudio(deps: { Context?: AudioContextCtor } = {}) {
  let ctx: AudioContextLike | null = null;

  function resolveContextCtor(): AudioContextCtor | null {
    if (deps.Context) return deps.Context;
    if (typeof window === "undefined") return null;
    const fromWindow = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    return fromWindow.AudioContext ?? fromWindow.webkitAudioContext ?? null;
  }

  function ensure() {
    const Ctor = resolveContextCtor();
    if (!ctx && Ctor) {
      ctx = new Ctor();
    }
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  }

  function playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    delay: number,
  ) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.14, t0 + Math.min(0.06, duration * 0.3));
    gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function playPhase(phase: Phase, soundEnabled: boolean) {
    if (!soundEnabled) return;
    if (!ctx) return;
    for (const tone of PHASE_TONES[phase]) {
      playTone(tone.start, tone.end, tone.duration, tone.delay);
    }
  }

  return {
    ensure,
    playPhase,
    get context() {
      return ctx;
    },
  };
}

export type BreathingAudio = ReturnType<typeof createBreathingAudio>;
