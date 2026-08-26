-- Add rest duration to settings (default 2s) and session snapshots (default 0:
-- historical rows had no rest; do not backfill with 2).

alter table public.breathing_settings
  add column rest_seconds integer not null default 2;

alter table public.breathing_settings
  add constraint breathing_settings_rest_seconds_check
    check (rest_seconds between 1 and 15);

alter table public.breathing_sessions
  add column rest_seconds integer not null default 0;

alter table public.breathing_sessions
  add constraint breathing_sessions_rest_seconds_check
    check (rest_seconds >= 0);
