"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { formatElapsed } from "@/domain";
import type { SessionHistoryPayload } from "./session-history-source";
import {
  createHttpSessionHistorySource,
  resolveClientTimeZone,
  type SessionHistorySource,
} from "./session-history-source";

const HISTORY_PANEL_ID = "history-panel";
const DEFAULT_HISTORY_SOURCE = createHttpSessionHistorySource();

type HistoryPanelProps = {
  source?: SessionHistorySource;
  sessionSavedRevision?: number;
};

export function HistoryPanel({
  source = DEFAULT_HISTORY_SOURCE,
  sessionSavedRevision = 0,
}: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SessionHistoryPayload | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId().replace(/:/g, "");
  const panelDomId = `${HISTORY_PANEL_ID}-${panelId}`;

  const fetchHistory = useCallback(async () => {
    return source.load(resolveClientTimeZone());
  }, [source]);

  const applyHistory = useCallback((payload: SessionHistoryPayload | null) => {
    setData(payload);
    setLoaded(true);
    setLoading(false);
  }, []);

  const beginLoad = useCallback(() => {
    setLoading(true);
    void fetchHistory()
      .then(applyHistory)
      .catch(() => {
        applyHistory(null);
      });
  }, [applyHistory, fetchHistory]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next && !loaded && !loading) {
        beginLoad();
      }
      return next;
    });
  }

  useEffect(() => {
    if (!open || !loaded || sessionSavedRevision === 0) return;
    let cancelled = false;
    void fetchHistory()
      .then((payload) => {
        if (!cancelled && payload !== null) {
          setData(payload);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchHistory, loaded, open, sessionSavedRevision]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const summary = data?.summary;
  const recentRecords = data?.records.slice(0, 5) ?? [];

  return (
    <div className="panel history-panel">
      <button
        ref={triggerRef}
        type="button"
        className="history-toggle label-tier"
        aria-expanded={open}
        aria-controls={panelDomId}
        onClick={toggle}
      >
        History
      </button>
      <div
        id={panelDomId}
        className="history-fields"
        hidden={!open}
        data-expanded={open ? "true" : undefined}
      >
        {loading && !data ? (
          <p className="history-status">Loading session history…</p>
        ) : null}
        {!loading && loaded && data === null ? (
          <p className="history-status">Session history is unavailable right now.</p>
        ) : null}
        {summary ? (
          <>
            <div className="history-stats">
              <div className="stat">
                <span className="stat-label label-tier">Streak</span>
                <span className="stat-value">{summary.currentStreak}</span>
              </div>
              <div className="stat">
                <span className="stat-label label-tier">This week</span>
                <span className="stat-value">{summary.sessionsThisWeek}</span>
              </div>
              <div className="stat">
                <span className="stat-label label-tier">Total</span>
                <span className="stat-value">{summary.totalSessions}</span>
              </div>
              <div className="stat">
                <span className="stat-label label-tier">Time</span>
                <span className="stat-value">
                  {formatElapsed(summary.totalElapsedSeconds)}
                </span>
              </div>
            </div>
            {recentRecords.length > 0 ? (
              <ul className="history-list">
                {recentRecords.map((record) => (
                  <li key={record.createdAtEpochMs} className="history-item">
                    <span className="history-item-date">
                      {formatHistoryDate(record.calendarDay)}
                    </span>
                    <span className="history-item-meta">
                      {record.cycleCount}{" "}
                      {record.cycleCount === 1 ? "cycle" : "cycles"} ·{" "}
                      {formatElapsed(record.elapsedSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="history-status">Complete a session to see it here.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatHistoryDate(day: SessionHistoryPayload["records"][number]["calendarDay"]) {
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}
