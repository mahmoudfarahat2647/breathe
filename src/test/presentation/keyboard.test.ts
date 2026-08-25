import { describe, expect, it, vi } from "vitest";

import { handleBreathingKeydown } from "@/presentation/keyboard";

function keyEvent(init: {
  key?: string;
  code?: string;
  tagName?: string;
  role?: string;
}): KeyboardEvent {
  const target = document.createElement(
    (init.tagName ?? "DIV").toLowerCase(),
  );
  if (init.role) {
    target.setAttribute("role", init.role);
  }
  return {
    key: init.key ?? "",
    code: init.code ?? "",
    target,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe("handleBreathingKeydown", () => {
  it("toggles start/pause on Space when focus is not on a control", () => {
    const start = vi.fn();
    const pause = vi.fn();
    const reset = vi.fn();
    const event = keyEvent({ code: "Space", key: " " });

    handleBreathingKeydown(event, {
      status: "idle",
      start,
      pause,
      reset,
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(start).toHaveBeenCalledOnce();
    expect(pause).not.toHaveBeenCalled();
  });

  it("pauses on Space while running", () => {
    const start = vi.fn();
    const pause = vi.fn();
    const event = keyEvent({ code: "Space", key: " " });

    handleBreathingKeydown(event, {
      status: "running",
      start,
      pause,
      reset: vi.fn(),
    });

    expect(pause).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("resets on r and R even when a button is focused", () => {
    const reset = vi.fn();
    handleBreathingKeydown(keyEvent({ key: "r", tagName: "BUTTON" }), {
      status: "running",
      start: vi.fn(),
      pause: vi.fn(),
      reset,
    });
    handleBreathingKeydown(keyEvent({ key: "R", tagName: "INPUT" }), {
      status: "paused",
      start: vi.fn(),
      pause: vi.fn(),
      reset,
    });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("does not steal Space from a focused button or input", () => {
    const start = vi.fn();
    const pause = vi.fn();
    const event = keyEvent({ code: "Space", key: " ", tagName: "BUTTON" });

    handleBreathingKeydown(event, {
      status: "idle",
      start,
      pause,
      reset: vi.fn(),
    });

    expect(start).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("does not steal Space from a focused semantic switch", () => {
    const start = vi.fn();
    const pause = vi.fn();
    const event = keyEvent({
      code: "Space",
      key: " ",
      tagName: "SPAN",
      role: "switch",
    });

    handleBreathingKeydown(event, {
      status: "idle",
      start,
      pause,
      reset: vi.fn(),
    });

    expect(start).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
