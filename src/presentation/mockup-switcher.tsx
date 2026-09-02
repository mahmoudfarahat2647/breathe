"use client";

/**
 * PROTOTYPE (mockup restyle) — floating dev-only toggle between the production
 * screen (`real`) and the redesign candidate (`mockup`). Modeled on the
 * throwaway src/presentation/prototype-switcher.tsx from issue #17.
 *
 * Framework-agnostic by design (no next/navigation here): it lives in
 * src/presentation/, so it stays inside the Clean Architecture boundary even as
 * prototype code. Reading/writing the URL is the caller's job — see
 * src/app/mockup-variant-controller.tsx. This component only reports the chosen
 * key via onSelect.
 *
 * Throwaway: delete with the rest of the `mockup-variant` plumbing once the
 * redesign is folded into the real code.
 */

type MockupSwitcherProps = {
  current: string;
  onSelect: (key: "real" | "mockup") => void;
};

export function MockupSwitcher({ current, onSelect }: MockupSwitcherProps) {
  if (process.env.NODE_ENV === "production") return null;

  const isMockup = current === "mockup";

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
        gap: 8,
        padding: "6px 8px",
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
        onClick={() => onSelect("real")}
        aria-pressed={!isMockup}
        style={{
          background: isMockup ? "none" : "#3a3a3a",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          borderRadius: 999,
          padding: "4px 12px",
        }}
      >
        real
      </button>
      <button
        type="button"
        onClick={() => onSelect("mockup")}
        aria-pressed={isMockup}
        style={{
          background: isMockup ? "#3a3a3a" : "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          borderRadius: 999,
          padding: "4px 12px",
        }}
      >
        mockup
      </button>
    </div>
  );
}
