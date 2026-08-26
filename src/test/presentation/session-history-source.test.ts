import { describe, expect, it, vi } from "vitest";

import {
  createHttpSessionHistorySource,
  resolveClientTimeZone,
} from "@/presentation/session-history-source";

describe("createHttpSessionHistorySource", () => {
  it("requests history with query and header time zones", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      async json() {
        return {
          records: [],
          summary: {
            totalSessions: 0,
            totalElapsedSeconds: 0,
            sessionsThisWeek: 0,
            currentStreak: 0,
          },
        };
      },
    });

    const source = createHttpSessionHistorySource({ fetch: fetchImpl });
    await source.load("America/New_York");

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/sessions/history");
    expect(url).toContain("timeZone=America%2FNew_York");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      "X-Time-Zone": "America/New_York",
    });
  });

  it("returns null on HTTP failure without throwing", async () => {
    const source = createHttpSessionHistorySource({
      fetch: vi.fn().mockResolvedValue({ ok: false }),
    });

    await expect(source.load("UTC")).resolves.toBeNull();
  });

  it("returns null on network failure without throwing", async () => {
    const source = createHttpSessionHistorySource({
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(source.load("UTC")).resolves.toBeNull();
  });
});

describe("resolveClientTimeZone", () => {
  it("returns a non-empty time zone string", () => {
    expect(resolveClientTimeZone().length).toBeGreaterThan(0);
  });
});
