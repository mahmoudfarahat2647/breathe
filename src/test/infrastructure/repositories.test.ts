import { describe, expect, it } from "vitest";

import { PersistenceError, UnauthenticatedError } from "@/infrastructure";
import { DomainValidationError } from "@/domain";
import { toErrorResponse } from "@/infrastructure/http/error-response";
import { SupabaseSessionRepository } from "@/infrastructure/repositories/supabase-session-repository";
import { SupabaseSettingsRepository } from "@/infrastructure/repositories/supabase-settings-repository";
import type { BreathingSupabaseClient } from "@/infrastructure";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("toErrorResponse", () => {
  it("maps auth, validation, and persistence failures", async () => {
    await expect(toErrorResponse(new UnauthenticatedError()).json()).resolves.toEqual({
      error: "Authentication is required.",
    });
    expect(toErrorResponse(new UnauthenticatedError()).status).toBe(401);
    expect(toErrorResponse(new DomainValidationError("bad")).status).toBe(400);
    const persistenceResponse = toErrorResponse(new PersistenceError("down"));
    expect(persistenceResponse.status).toBe(503);
    await expect(persistenceResponse.json()).resolves.toEqual({
      error: "Persistence is temporarily unavailable.",
    });
  });
});

describe("SupabaseSettingsRepository", () => {
  it("returns null when no settings row exists", async () => {
    const repository = new SupabaseSettingsRepository(
      {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return { data: null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await expect(repository.getByUserId(USER_ID)).resolves.toBeNull();
  });

  it("maps a stored row to a DTO", async () => {
    const repository = new SupabaseSettingsRepository(
      {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          user_id: USER_ID,
                          inhale_seconds: 5,
                          hold_seconds: 2,
                          exhale_seconds: 8,
                          rest_seconds: 3,
                          goal_type: null,
                          goal_value: null,
                          ramp: null,
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await expect(repository.getByUserId(USER_ID)).resolves.toEqual({
      durations: { inhale: 5, hold: 2, exhale: 8, rest: 3 },
      goal: null,
      ramp: null,
    });
  });

  it("upserts settings using database columns", async () => {
    let saved: unknown;
    const repository = new SupabaseSettingsRepository(
      {
        from() {
          return {
            async upsert(row: unknown) {
              saved = row;
              return { error: null };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await repository.save(USER_ID, {
      durations: { inhale: 7, hold: 3, exhale: 9, rest: 2 },
      goal: { kind: "minutes", minutes: 5 },
      ramp: null,
    });
    expect(saved).toEqual({
      user_id: USER_ID,
      inhale_seconds: 7,
      hold_seconds: 3,
      exhale_seconds: 9,
      rest_seconds: 2,
      goal_type: "minutes",
      goal_value: 5,
      ramp: null,
    });
  });
});

describe("SupabaseSessionRepository", () => {
  it("inserts an idempotent snapshot and ignores duplicates", async () => {
    let options: unknown;
    const repository = new SupabaseSessionRepository(
      {
        from() {
          return {
            async upsert(_row: unknown, upsertOptions: unknown) {
              options = upsertOptions;
              return { error: null };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await repository.save({
      id: SESSION_ID,
      userId: USER_ID,
      cycleCount: 2,
      elapsedSeconds: 28,
      durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    });

    expect(options).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("surfaces database errors", async () => {
    const repository = new SupabaseSessionRepository(
      {
        from() {
          return {
            async upsert() {
              return { error: { message: "write failed" } };
            },
          };
        },
      } as unknown as BreathingSupabaseClient,
    );

    await expect(
      repository.save({
        id: SESSION_ID,
        userId: USER_ID,
        cycleCount: 1,
        elapsedSeconds: 14,
        durations: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });
});
