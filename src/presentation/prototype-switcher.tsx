"use client";

/**
 * PROTOTYPE — shared floating variant switcher for UI prototypes (currently
 * used by #17's Control Deck visual-language mockup). Throwaway: delete
 * along with the variant components once a direction is picked.
 *
 * Framework-agnostic by design (no next/navigation here) — this lives in
 * src/presentation/, so it stays inside the Clean Architecture boundary
 * even as prototype code. Reading/writing the URL is the caller's job
 * (see src/app/prototype-variant-controller.tsx); this component just
 * reports the chosen key via onSelect.
 */

import { useEffect } from "react";

type PrototypeSwitcherProps = {
  variants: { key: string; name: string }[];
  current: string;
  onSelect: (key: string) => void;
};

export function PrototypeSwitcher({
  variants,
  current,
  onSelect,
}: PrototypeSwitcherProps) {
  const currentIndex = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  function go(nextIndex: number) {
    const wrapped = (nextIndex + variants.length) % variants.length;
    onSelect(variants[wrapped].key);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable) return;
      if (event.key === "ArrowLeft") go(currentIndex - 1);
      if (event.key === "ArrowRight") go(currentIndex + 1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  if (process.env.NODE_ENV === "production") return null;

  const label = variants[currentIndex];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 999,
        background: "#1a1a1a",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <button
        type="button"
        onClick={() => go(currentIndex - 1)}
        aria-label="Previous variant"
        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
      >
        ←
      </button>
      <span style={{ minWidth: 140, textAlign: "center" }}>
        {label.key} ({label.name})
      </span>
      <button
        type="button"
        onClick={() => go(currentIndex + 1)}
        aria-label="Next variant"
        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
      >
        →
      </button>
    </div>
  );
}
