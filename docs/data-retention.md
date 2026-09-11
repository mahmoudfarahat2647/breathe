# Data retention and erasure

Scope: the two user-owned tables in `supabase/migrations/` — `breathing_settings` (one row
per user) and `breathing_sessions` (one row per completed Session).

## What is stored

`breathing_sessions` stores a Session snapshot: cycle count, elapsed seconds, the four Phase
durations, and `created_at`. It carries no free text, no device identifiers, and no location.
`breathing_settings` stores the user's Preset durations and related Preferences.

Both tables key on `user_id` with `references auth.users (id) on delete cascade`.

## Retention

Breathing history is retained for the lifetime of the account. There is no time-based
expiry: streak and lifetime-total statistics are derived from the full history
(`src/domain/session-stats.ts`), so pruning old rows would silently change user-visible
numbers.

## Erasure

**Account deletion is the supported erasure path.** Deleting the `auth.users` row cascades
to both tables, so no orphaned breathing data remains.

There is deliberately no per-row deletion today. RLS grants authenticated users `select` and
`insert` on `breathing_sessions` but not `delete` or `update` — this is asserted in
`supabase/tests/breathing_rls_test.sql` ("authenticated users cannot delete session
snapshots"). Session snapshots are append-only by design: a Session that happened cannot be
edited after the fact, which is what makes the Streak trustworthy.

## Known gap

There is no in-product "clear my history" control short of deleting the account. Tracked as a
follow-up in [issue #50](https://github.com/mahmoudfarahat2647/breathe/issues/50); adding one means granting `delete` in RLS, inverting the assertion above, and
adding a `DELETE /api/sessions` route.
