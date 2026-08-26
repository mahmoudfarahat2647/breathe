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
});
