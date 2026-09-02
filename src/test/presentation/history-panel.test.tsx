import fs from "node:fs";
import path from "node:path";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HistoryPanel } from "@/presentation/history-panel";
import type {
  SessionHistoryPayload,
  SessionHistorySource,
} from "@/presentation/session-history-source";

const SAMPLE: SessionHistoryPayload = {
  records: [
    {
      cycleCount: 3,
      elapsedSeconds: 90,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      createdAtEpochMs: 1,
      calendarDay: { year: 2026, month: 8, day: 26 },
    },
  ],
  summary: {
    totalSessions: 1,
    totalElapsedSeconds: 90,
    sessionsThisWeek: 1,
    currentStreak: 1,
  },
};

function createSource(
  loader: SessionHistorySource["load"],
): SessionHistorySource {
  return { load: loader };
}

describe("HistoryPanel", () => {
  it("lazy loads when opened and renders summary stats", async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockResolvedValue(SAMPLE);

    render(<HistoryPanel source={createSource(load)} />);

    expect(load).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => {
      expect(load).toHaveBeenCalledOnce();
    });
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("01:30")).toBeInTheDocument();
    expect(screen.getByText(/3 cycles · 01:30/)).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        source={createSource(vi.fn().mockResolvedValue(SAMPLE))}
      />,
    );

    const trigger = screen.getByRole("button", { name: "History" });
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("refetches when sessionSavedRevision changes after the first load", async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockResolvedValue(SAMPLE);
    const { rerender } = render(
      <HistoryPanel source={createSource(load)} sessionSavedRevision={0} />,
    );

    await user.click(screen.getByRole("button", { name: "History" }));
    await waitFor(() => {
      expect(load).toHaveBeenCalledOnce();
    });

    rerender(
      <HistoryPanel source={createSource(load)} sessionSavedRevision={1} />,
    );

    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(2);
    });
  });

  it("shows a non-blocking message when loading fails", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel source={createSource(vi.fn().mockResolvedValue(null))} />,
    );

    await user.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => {
      expect(
        screen.getByText("Session history is unavailable right now."),
      ).toBeInTheDocument();
    });
  });

  it("handles source rejection in beginLoad without getting stuck in loading", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        source={createSource(vi.fn().mockRejectedValue(new Error("network error")))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => {
      expect(
        screen.getByText("Session history is unavailable right now."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading session history…")).not.toBeInTheDocument();
  });

  it("preserves already-loaded history when a refetch fails", async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockResolvedValueOnce(SAMPLE)
      .mockResolvedValueOnce(null);

    const { rerender } = render(
      <HistoryPanel source={createSource(load)} sessionSavedRevision={0} />,
    );

    await user.click(screen.getByRole("button", { name: "History" }));
    await waitFor(() => {
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });

    rerender(
      <HistoryPanel source={createSource(load)} sessionSavedRevision={1} />,
    );

    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(2);
    });
    // Data remains rendered and is not wiped
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(
      screen.queryByText("Session history is unavailable right now."),
    ).not.toBeInTheDocument();
  });

  it("works with the default source prop without triggering an unbounded request loop", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE,
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      const { rerender } = render(<HistoryPanel sessionSavedRevision={0} />);

      await user.click(screen.getByRole("button", { name: "History" }));
      await waitFor(() => {
        expect(screen.getByText("Streak")).toBeInTheDocument();
      });
      expect(mockFetch).toHaveBeenCalledOnce();

      rerender(<HistoryPanel sessionSavedRevision={1} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Wait a moment to ensure no infinite loop occurs
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("closes when clicking outside the panel and sets aria-expanded to false", async () => {
    const user = userEvent.setup();
    render(<HistoryPanel source={createSource(vi.fn().mockResolvedValue(SAMPLE))} />);

    const trigger = screen.getByRole("button", { name: "History" });
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });

    const panelDomId = trigger.getAttribute("aria-controls")!;
    const panel = document.getElementById(panelDomId)!;
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");

    // Click outside on document.body
    await user.click(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");
  });

  it("does not close when clicking inside the panel content", async () => {
    const user = userEvent.setup();
    render(<HistoryPanel source={createSource(vi.fn().mockResolvedValue(SAMPLE))} />);

    const trigger = screen.getByRole("button", { name: "History" });
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });

    const panelDomId = trigger.getAttribute("aria-controls")!;
    const panel = document.getElementById(panelDomId)!;
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Click inside the panel on a stat label
    await user.click(screen.getByText("Streak"));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");

    // Click inside the panel on a stat value
    await user.click(screen.getByText("This week"));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
  });

  it("allows trigger click to toggle open and closed without outside-click interference", async () => {
    const user = userEvent.setup();
    render(<HistoryPanel source={createSource(vi.fn().mockResolvedValue(SAMPLE))} />);

    const trigger = screen.getByRole("button", { name: "History" });
    const panelDomId = trigger.getAttribute("aria-controls")!;

    // First click opens
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(panelDomId)!;
    expect(panel).not.toHaveAttribute("hidden");

    // Second click closes
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");

    // Third click re-opens
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
  });

  it("retains bounded height, internal scroll, and non-modal disclosure semantics when open", async () => {
    const user = userEvent.setup();
    render(<HistoryPanel source={createSource(vi.fn().mockResolvedValue(SAMPLE))} />);

    const trigger = screen.getByRole("button", { name: "History" });
    await user.click(trigger);
    const panelDomId = trigger.getAttribute("aria-controls")!;
    const panel = document.getElementById(panelDomId)!;

    expect(panel).toHaveClass("history-fields");
    // Non-modal disclosure semantics: NO role="dialog", NO aria-modal
    expect(panel).not.toHaveAttribute("role", "dialog");
    expect(panel).not.toHaveAttribute("aria-modal");

    // Verify globals.css defines bounded height, scroll, and stacking for .history-fields
    const cssPath = path.resolve(__dirname, "../../app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*max-block-size:\s*min\(70vh,\s*32rem\)/,
    );
    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*overflow-y:\s*auto/,
    );
    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*overscroll-behavior:\s*contain/,
    );
    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*z-index:\s*50/,
    );
    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*background:\s*var\(--panel/i,
    );
    expect(cssContent).toMatch(
      /\.history-fields\s*\{[^}]*border:\s*1px solid var\(--panel-border\)/,
    );
  });

  it("defines edge-to-edge sheet layout and safe-area padding at narrow viewports (~390px) via media query", () => {
    const cssPath = path.resolve(__dirname, "../../app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Narrow viewport media query covers ~390px (e.g. max-width: 480px)
    expect(cssContent).toMatch(
      /@media\s*\([^)]*max-width:\s*480px\)[^{]*\{[\s\S]*?\.history-fields\s*\{[\s\S]*?position:\s*fixed/,
    );
    expect(cssContent).toMatch(
      /@media\s*\([^)]*max-width:\s*480px\)[^{]*\{[\s\S]*?\.history-fields\s*\{[\s\S]*?inset-inline:\s*0/,
    );
    expect(cssContent).toMatch(
      /@media\s*\([^)]*max-width:\s*480px\)[^{]*\{[\s\S]*?\.history-fields\s*\{[\s\S]*?bottom:\s*0/,
    );
    expect(cssContent).toMatch(
      /@media\s*\([^)]*max-width:\s*480px\)[^{]*\{[\s\S]*?\.history-fields\s*\{[\s\S]*?env\(safe-area-inset-bottom/,
    );
  });

  it("forwards optional className to the root container", () => {
    const { container } = render(<HistoryPanel className="header-history-overlay" />);
    expect(container.firstElementChild).toHaveClass("history-panel", "header-history-overlay");
  });
});
