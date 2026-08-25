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
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
    expect(
      hasSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toBe(true);
  });

  it("accepts the publishable key alias", () => {
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }).anonKey,
    ).toBe("publishable-key");
  });

  it("rejects a missing URL or key", () => {
    expect(() => getSupabasePublicEnv({})).toThrow(PersistenceConfigError);
    expect(hasSupabasePublicEnv({})).toBe(false);
  });

  it("rejects a service-role JWT so it cannot reach the browser client", () => {
    expect(() =>
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtWithRole("service_role"),
      }),
    ).toThrow(/Service-role/);
  });
});
