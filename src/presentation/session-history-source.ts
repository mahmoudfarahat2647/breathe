import type {
  SessionHistoryRecordDto,
  SessionHistorySummaryDto,
} from "@/domain";

export type SessionHistoryPayload = {
  records: SessionHistoryRecordDto[];
  summary: SessionHistorySummaryDto;
};

export type SessionHistorySource = {
  load(timeZone: string): Promise<SessionHistoryPayload | null>;
};

type FetchLike = typeof fetch;

export function createHttpSessionHistorySource(options?: {
  fetch?: FetchLike;
}): SessionHistorySource {
  return {
    async load(timeZone) {
      const fetchImpl = options?.fetch ?? globalThis.fetch;
      try {
        const url = new URL("/api/sessions/history", window.location.origin);
        url.searchParams.set("timeZone", timeZone);
        const response = await fetchImpl(url.toString(), {
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-Time-Zone": timeZone,
          },
        });
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as SessionHistoryPayload;
      } catch {
        return null;
      }
    },
  };
}

export function resolveClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
