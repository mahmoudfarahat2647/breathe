-- Allow zero-second hold and rest for breathing pattern presets.

alter table public.breathing_settings
  drop constraint if exists breathing_settings_hold_seconds_check;

alter table public.breathing_settings
  add constraint breathing_settings_hold_seconds_check
    check (hold_seconds between 0 and 15);

alter table public.breathing_settings
  drop constraint if exists breathing_settings_rest_seconds_check;

alter table public.breathing_settings
  add constraint breathing_settings_rest_seconds_check
    check (rest_seconds between 0 and 15);

alter table public.breathing_sessions
  drop constraint if exists breathing_sessions_hold_seconds_check;

alter table public.breathing_sessions
  add constraint breathing_sessions_hold_seconds_check
    check (hold_seconds between 0 and 15);

alter table public.breathing_sessions
  drop constraint if exists breathing_sessions_rest_seconds_check;

alter table public.breathing_sessions
  add constraint breathing_sessions_rest_seconds_check
    check (rest_seconds >= 0);
