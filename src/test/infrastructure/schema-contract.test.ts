import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = "supabase/migrations";
const migration = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n");
const envExample = readFileSync(".env.example", "utf8");

describe("schema contract", () => {
  it("ties both tables to auth.users with cascade deletes", () => {
    expect(migration.match(/references auth\.users \(id\) on delete cascade/g)).toHaveLength(
      2,
    );
  });

  it("enforces duration and session checks plus the history index", () => {
    expect(migration).toMatch(/inhale_seconds between 2 and 15/);
    expect(migration).toMatch(/hold_seconds between 0 and 15/);
    expect(migration).toMatch(/exhale_seconds between 2 and 15/);
    expect(migration).toMatch(/rest_seconds between 0 and 15/);
    for (const column of ["inhale_seconds", "hold_seconds", "exhale_seconds", "rest_seconds"]) {
      const typeMatches = migration.match(
        new RegExp(`alter column ${column} type numeric\\(3,1\\)`, "g"),
      );
      expect(typeMatches, `${column} is widened to numeric(3,1) on both tables`).toHaveLength(2);

      const halfStepMatches = migration.match(
        new RegExp(`\\(${column} \\* 2\\) = floor\\(${column} \\* 2\\)`, "g"),
      );
      expect(
        halfStepMatches,
        `${column} has a half-step check constraint on both tables`,
      ).toHaveLength(2);

      expect(migration).toMatch(
        new RegExp(`breathing_settings_${column}_half_step_check`),
      );
      expect(migration).toMatch(
        new RegExp(`breathing_sessions_${column}_half_step_check`),
      );
    }
    expect(migration).toMatch(/goal_type = 'minutes' and goal_value between 1 and 120/);
    expect(migration).toMatch(/goal_type = 'cycles' and goal_value between 1 and 100/);
    expect(migration).toMatch(/breathing_settings_goal_pair_check/);
    expect(migration).toMatch(/breathing_settings_ramp_check/);
    expect(migration).toMatch(
      /drop constraint if exists breathing_settings_ramp_check/,
    );
    expect(migration).toMatch(
      /ramp is null or ramp in \('wind-down', 'slow-down'\)/,
    );
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
