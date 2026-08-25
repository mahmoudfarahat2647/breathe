import type { EngineStatus } from "@/domain/breathing-engine";

export type BreathingKeyActions = {
  status: EngineStatus;
  start: () => void;
  pause: () => void;
  reset: () => void;
};

function isNativeKeyboardControl(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "BUTTON" || tag === "INPUT") return true;
  return target.getAttribute("role") === "switch";
}

export function handleBreathingKeydown(
  event: KeyboardEvent,
  actions: BreathingKeyActions,
): void {
  const target = event.target as HTMLElement | null;

  if (isNativeKeyboardControl(target)) {
    if (event.key === "r" || event.key === "R") {
      actions.reset();
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (actions.status === "running") actions.pause();
    else actions.start();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    actions.reset();
  }
}
