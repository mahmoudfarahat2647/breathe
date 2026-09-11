import { describe, expect, it } from "vitest";

import {
  PersistenceConfigError,
  getSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "@/infrastructure";

function jwtWithRole(role: string): string {
  const payload = btoa(JSON.stringify({ role }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${payload}.sig`;
}

describe("getSupabasePublicEnv", () => {
  it("reads the public URL and anon key", () => {
    const anonJwt = jwtWithRole("anon");
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonJwt,
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: anonJwt,
    });
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonJwt,
      }),
    ).toBe(true);
  });

  it("accepts the publishable key alias", () => {
    const publishableKey = "sb_publishable_alias_key";
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      }).anonKey,
    ).toBe(publishableKey);
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      }),
    ).toBe(true);
  });

  it("accepts a legacy Supabase JWT with role: 'anon'", () => {
    const anonJwt = jwtWithRole("anon");
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonJwt,
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: anonJwt,
    });
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonJwt,
      }),
    ).toBe(true);
  });

  it("accepts a valid modern publishable key via NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    const publishableKey = "sb_publishable_test_anon_key_123";
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: publishableKey,
    });
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
      }),
    ).toBe(true);
  });

  it("accepts a valid modern publishable key via NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", () => {
    const publishableKey = "sb_publishable_test_publishable_key_456";
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: publishableKey,
    });
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      }),
    ).toBe(true);
  });

  it("trims leading and trailing whitespace from the key", () => {
    const publishableKey = "sb_publishable_sample_key";
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "  https://example.supabase.co  ",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: `  ${publishableKey}  `,
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: publishableKey,
    });
  });

  it("rejects a missing URL or key", () => {
    expect(() => getSupabasePublicEnv({})).toThrow(PersistenceConfigError);
    expect(hasSupabasePublicEnv({})).toBe(false);
  });

  it("rejects a modern Supabase secret key (sb_secret_...)", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_REPLACE_ME",
    };
    expect(() => getSupabasePublicEnv(env)).toThrow(PersistenceConfigError);
    expect(() => getSupabasePublicEnv(env)).toThrow(
      /Only anon or publishable keys belong in NEXT_PUBLIC_\* variables/,
    );
    expect(hasSupabasePublicEnv(env)).toBe(false);
  });

  it("rejects a service-role JWT so it cannot reach the browser client", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtWithRole("service_role"),
    };
    expect(() => getSupabasePublicEnv(env)).toThrow(PersistenceConfigError);
    expect(() => getSupabasePublicEnv(env)).toThrow(/Service-role/);
    expect(hasSupabasePublicEnv(env)).toBe(false);
  });

  it("rejects a JWT with any non-anon role (e.g. authenticated)", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtWithRole("authenticated"),
    };
    expect(() => getSupabasePublicEnv(env)).toThrow(PersistenceConfigError);
    expect(() => getSupabasePublicEnv(env)).toThrow(
      /Only anon or publishable keys belong in NEXT_PUBLIC_\* variables/,
    );
    expect(hasSupabasePublicEnv(env)).toBe(false);
  });

  it("rejects an unrecognized opaque string", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "unrecognized-opaque-string",
    };
    expect(() => getSupabasePublicEnv(env)).toThrow(PersistenceConfigError);
    expect(() => getSupabasePublicEnv(env)).toThrow(
      /Only anon or publishable keys belong in NEXT_PUBLIC_\* variables/,
    );
    expect(hasSupabasePublicEnv(env)).toBe(false);
  });

  it("rejects keys with case-mismatched publishable prefix", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "SB_PUBLISHABLE_sample",
    };
    expect(() => getSupabasePublicEnv(env)).toThrow(PersistenceConfigError);
    expect(hasSupabasePublicEnv(env)).toBe(false);
  });
});
