import { describe, expect, it, vi } from "vitest";

import { createHttpBreathingPersistence } from "@/presentation/persistence";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createHttpBreathingPersistence", () => {
  it("signs in anonymously before loading stored settings", async () => {
    const calls: string[] = [];
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url}`);
        if (url === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        return jsonResponse({ inhale: 5, hold: 2, exhale: 8, rest: 3 });
      }) as typeof fetch,
    });

    await expect(persistence.initialize()).resolves.toEqual({
      inhale: 5,
      hold: 2,
      exhale: 8,
      rest: 3,
    });
    expect(calls).toEqual([
      "POST /api/auth/anonymous",
      "GET /api/settings",
    ]);
  });

  it("falls back to 4-4-6 when auth or settings requests fail", async () => {
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async () => {
        throw new Error("offline");
      }) as typeof fetch,
    });

    await expect(persistence.initialize()).resolves.toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
  });

  it("falls back to 4-4-6 when stored settings are invalid", async () => {
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        if (String(input) === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        void init;
        return jsonResponse({ inhale: 1, hold: 4, exhale: 6, rest: 2 });
      }) as typeof fetch,
    });

    await expect(persistence.initialize()).resolves.toEqual({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
    });
  });

  it("saves settings without a client-supplied user id and swallows failures", async () => {
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        if (url === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        expect(url).toBe("/api/settings");
        expect(init?.method).toBe("PUT");
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({ inhale: 7, hold: 3, exhale: 9, rest: 2 });
        expect(body).not.toHaveProperty("userId");
        expect(body).not.toHaveProperty("user_id");
        throw new Error("offline");
      }) as typeof fetch,
    });

    await expect(
      persistence.saveSettings({ inhale: 7, hold: 3, exhale: 9, rest: 2 }),
    ).resolves.toBeUndefined();
  });

  it("awaits anonymous auth before putting settings", async () => {
    const calls: string[] = [];
    let resolveAuth!: (value: Response) => void;
    const authGate = new Promise<Response>((resolve) => {
      resolveAuth = resolve;
    });

    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url}`);
        if (url === "/api/auth/anonymous") {
          return authGate;
        }
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });

    const savePromise = persistence.saveSettings({
      inhale: 7,
      hold: 3,
      exhale: 9,
      rest: 2,
    });

    await Promise.resolve();
    expect(calls).toEqual(["POST /api/auth/anonymous"]);

    resolveAuth(jsonResponse({ userId: USER_ID }));
    await expect(savePromise).resolves.toBeUndefined();
    expect(calls).toEqual([
      "POST /api/auth/anonymous",
      "PUT /api/settings",
    ]);
  });

  it("retries settings put once after 401 by re-ensuring anonymous auth", async () => {
    const calls: string[] = [];
    let settingsPuts = 0;
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url}`);
        if (url === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        if (method === "PUT") {
          settingsPuts += 1;
          if (settingsPuts === 1) {
            return jsonResponse({ error: "unauthorized" }, 401);
          }
          return jsonResponse({ ok: true });
        }
        return jsonResponse({ inhale: 5, hold: 2, exhale: 8, rest: 3 });
      }) as typeof fetch,
    });

    await persistence.initialize();
    await expect(
      persistence.saveSettings({ inhale: 5, hold: 2, exhale: 8, rest: 3 }),
    ).resolves.toBeUndefined();

    expect(calls).toEqual([
      "POST /api/auth/anonymous",
      "GET /api/settings",
      "PUT /api/settings",
      "POST /api/auth/anonymous",
      "PUT /api/settings",
    ]);
  });
  it("resolves when settings save remains non-ok after retry", async () => {
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input) => {
        if (String(input) === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        return jsonResponse({ error: "forbidden" }, 403);
      }) as typeof fetch,
    });

    await expect(
      persistence.saveSettings({ inhale: 7, hold: 3, exhale: 9, rest: 2 }),
    ).resolves.toBeUndefined();
  });

  it("passes keepalive on settings put when requested", async () => {
    let keepalive: boolean | undefined;
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        if (String(input) === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        keepalive = init?.keepalive;
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });

    await persistence.saveSettings(
      { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      { keepalive: true },
    );
    expect(keepalive).toBe(true);
  });

  it("posts a session snapshot without a trusted user id", async () => {
    const bodies: unknown[] = [];
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        if (url === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        expect(url).toBe("/api/sessions");
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        expect(body).not.toHaveProperty("userId");
        expect(body).not.toHaveProperty("user_id");
        return jsonResponse({ outcome: "saved" });
      }) as typeof fetch,
    });

    const snapshot = {
      id: SESSION_ID,
      cycleCount: 2,
      elapsedSeconds: 28,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    };

    await persistence.saveSession(snapshot);
    expect(bodies).toEqual([snapshot]);
  });

  it("awaits auth and re-authenticates on 401 before retrying the same session id", async () => {
    const calls: string[] = [];
    let sessionAttempts = 0;
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url}`);
        if (url === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        sessionAttempts += 1;
        if (sessionAttempts === 1) {
          return jsonResponse({ error: "auth required" }, 401);
        }
        return jsonResponse({ outcome: "saved" });
      }) as typeof fetch,
    });

    const snapshot = {
      id: SESSION_ID,
      cycleCount: 2,
      elapsedSeconds: 28,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    };

    await persistence.saveSession(snapshot);
    expect(calls).toEqual([
      "POST /api/auth/anonymous",
      "POST /api/sessions",
      "POST /api/auth/anonymous",
      "POST /api/sessions",
    ]);
  });

  it("does not retry validation failures", async () => {
    let sessionAttempts = 0;
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async (input) => {
        if (String(input) === "/api/auth/anonymous") {
          return jsonResponse({ userId: USER_ID });
        }
        sessionAttempts += 1;
        return jsonResponse({ error: "invalid" }, 400);
      }) as typeof fetch,
    });

    await persistence.saveSession({
      id: SESSION_ID,
      cycleCount: 1,
      elapsedSeconds: 14,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });
    expect(sessionAttempts).toBe(1);
  });

  it("does not throw when session retries also fail", async () => {
    const persistence = createHttpBreathingPersistence({
      fetch: vi.fn(async () => jsonResponse({ error: "down" }, 503)) as typeof fetch,
    });

    await expect(
      persistence.saveSession({
        id: SESSION_ID,
        cycleCount: 1,
        elapsedSeconds: 14,
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      }),
    ).resolves.toBeUndefined();
  });
});
