import { describe, expect, it, vi } from "vitest";

import {
  PersistenceError,
  ensureAnonymousSession,
} from "@/infrastructure";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("ensureAnonymousSession", () => {
  it("reuses an existing verified session", async () => {
    const signIn = vi.fn();
    const userId = await ensureAnonymousSession({
      auth: {
        async getClaims() {
          return { data: { claims: { sub: USER_ID } }, error: null };
        },
        signInAnonymously: signIn,
      },
    });

    expect(userId).toBe(USER_ID);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("silently signs in when no session exists", async () => {
    const userId = await ensureAnonymousSession({
      auth: {
        async getClaims() {
          return { data: { claims: null }, error: null };
        },
        async signInAnonymously() {
          return { data: { user: { id: USER_ID } }, error: null };
        },
      },
    });

    expect(userId).toBe(USER_ID);
  });

  it("surfaces anonymous sign-in failures", async () => {
    await expect(
      ensureAnonymousSession({
        auth: {
          async getClaims() {
            return { data: { claims: null }, error: null };
          },
          async signInAnonymously() {
            return { data: { user: null }, error: { message: "disabled" } };
          },
        },
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });
});
