import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260825202339_breathing_settings_and_sessions.sql",
  "utf8",
);
const envExample = readFileSync(".env.example", "utf8");

describe("schema contract", () => {
  it("ties both tables to auth.users with cascade deletes", () => {
    expect(migration.match(/references auth\.users \(id\) on delete cascade/g)).toHaveLength(
      2,
    );
  });

  it("enforces duration and session checks plus the history index", () => {
    expect(migration).toMatch(/inhale_seconds between 2 and 15/);
    expect(migration).toMatch(/hold_seconds between 1 and 15/);
    expect(migration).toMatch(/exhale_seconds between 2 and 15/);
    expect(migration).toMatch(/cycle_count >= 1/);
    expect(migration).toMatch(/elapsed_seconds >= 0/);
    expect(migration).toMatch(
      /breathing_sessions \(user_id, created_at desc\)/,
    );
  });

  it("enables operation-specific RLS with auth.uid ownership", () => {
    expect(migration).toMatch(/enable row level security/);
    expect(migration).toMatch(/force row level security/);
    expect(migration).toMatch(/for select/);
    expect(migration).toMatch(/for insert/);
    expect(migration).toMatch(/for update/);
    expect(migration).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    expect(migration).toMatch(/revoke all on table public\.breathing_settings from public, anon/);
    expect(migration).toMatch(/grant select, insert, update on table public\.breathing_settings to authenticated/);
    expect(migration).toMatch(/grant select, insert on table public\.breathing_sessions to authenticated/);
    expect(migration).not.toMatch(/service_role/);
  });

  it("does not expose a service-role secret in the env example", () => {
    expect(envExample).not.toMatch(/SERVICE_ROLE/i);
    expect(envExample).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
