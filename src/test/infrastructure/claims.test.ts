import { describe, expect, it } from "vitest";

import { DomainValidationError } from "@/domain";
import {
  UnauthenticatedError,
  sessionFromRequestBody,
  settingsFromRequestBody,
  userIdFromVerifiedClaims,
} from "@/infrastructure";

const CLAIM_USER = "11111111-1111-4111-8111-111111111111";
const BODY_USER = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("userIdFromVerifiedClaims", () => {
  it("returns the verified sub claim", async () => {
    const userId = await userIdFromVerifiedClaims({
      auth: {
        async getClaims() {
          return { data: { claims: { sub: CLAIM_USER } }, error: null };
        },
      },
    });
    expect(userId).toBe(CLAIM_USER);
  });

  it("rejects missing claims", async () => {
    await expect(
      userIdFromVerifiedClaims({
        auth: {
          async getClaims() {
            return { data: { claims: null }, error: null };
          },
        },
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe("request body ownership", () => {
  it("maps settings from the body without reading a user id", () => {
    expect(
      settingsFromRequestBody({
        inhale: 5,
        hold: 2,
        exhale: 8,
        userId: BODY_USER,
        user_id: BODY_USER,
      }),
    ).toEqual({ inhale: 5, hold: 2, exhale: 8 });
  });

  it("stamps the claim-derived user id onto sessions and ignores payload ownership", () => {
    expect(
      sessionFromRequestBody(
        {
          id: SESSION_ID,
          userId: BODY_USER,
          user_id: BODY_USER,
          cycleCount: 2,
          elapsedSeconds: 28,
          durations: { inhale: 4, hold: 4, exhale: 6 },
        },
        CLAIM_USER,
      ),
    ).toEqual({
      id: SESSION_ID,
      userId: CLAIM_USER,
      cycleCount: 2,
      elapsedSeconds: 28,
      durations: { inhale: 4, hold: 4, exhale: 6 },
    });
  });

  it("rejects a non-object body", () => {
    expect(() => settingsFromRequestBody("nope")).toThrow(DomainValidationError);
  });
});
