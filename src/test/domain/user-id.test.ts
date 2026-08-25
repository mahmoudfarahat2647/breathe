import { describe, expect, it } from "vitest";

import { DomainValidationError, UserId } from "@/domain";

const VALID = "11111111-1111-4111-8111-111111111111";

describe("UserId", () => {
  it("accepts a UUID and round-trips through a DTO string", () => {
    const userId = UserId.fromDto(VALID);
    expect(userId.toDto()).toBe(VALID);
    expect(UserId.fromDto(userId.toDto()).equals(userId)).toBe(true);
  });

  it("rejects empty and non-UUID values", () => {
    expect(() => UserId.fromDto("")).toThrow(DomainValidationError);
    expect(() => UserId.fromDto("not-a-uuid")).toThrow(DomainValidationError);
    expect(() => UserId.fromDto("11111111-1111-4111-8111-11111111111")).toThrow(
      DomainValidationError,
    );
  });
});
